import os

# Suppress specific warnings from Transformers library
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "true"

import argparse
import logging
import threading

from dotenv import load_dotenv
from huggingface_hub import login as hflogin


class Colors:
    BLUE_BOLD = "\033[1;34m"
    GREEN_BOLD = "\033[1;32m"
    BLUE = "\033[0;34m"
    GREEN = "\033[0;32m"
    RESET = "\033[0m"


logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
messages_lock = threading.Lock()

# Log in to hugging face (you need to have specific access for whichever model you use)
load_dotenv()
hflogin(os.getenv("HUGGINGFACE_KEY"))

# choose a model from these alternatives:
models = {
    "mistral": "mistralai/Mistral-7B-Instruct-v0.2",
    "meta-llama": "meta-llama/Meta-Llama-3-8B-Instruct",
    "phi": "microsoft/Phi-3-mini-4k-instruct",  # small, fast
    "gemma": "google/gemma-2b-it",
    "gemma2": "google/gemma-2-2b-it",
}


def load_system_prompt():
    # Load system prompt from external file
    system_prompt_path = ".system_prompt"
    if os.path.exists(system_prompt_path):
        with open(system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read().strip()
            logging.info(f"Loaded system prompt")
    else:
        logging.warning(
            f"System prompt file '{system_prompt_path}' not found. Please create it in the project root."
        )
        system_prompt = "You are a helpful assistant."

    return system_prompt


def parse_args():
    global parser
    parser = argparse.ArgumentParser(
        description="A script to chat with various LLMs.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "-m",
        "--model",
        choices=list(models.keys()),
        type=str,
        required=True,
        help="The model type to use.",
    )

    parser.add_argument(
        "--web-mode", action="store_true", help="Enable web mode for the model."
    )

    parser.add_argument(
        "-p", "--port", type=int, default=5000, help="Port for the web server."
    )

    return parser.parse_args()


def initialize_model_and_tokenizer(model_id):

    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        pipeline,
    )

    logging.info(f"Loading model: {model_id}. This may take a while...")
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    tokenizer.pad_token_id = tokenizer.eos_token_id

    # Create BitsAndBytesConfig for 4-bit quantization
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=quantization_config,
        dtype=torch.bfloat16,
        device_map="cuda",
    )

    # Create a text generation pipeline
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=256,
    )

    return tokenizer, pipe


def new_conversation(tokenizer, system_prompt, system_role_supported):
    messages = []
    if system_role_supported:
        print("System role supported by tokenizer chat template.")
        messages.append({"role": "system", "content": system_prompt})
    else:
        logging.info(
            "System role NOT supported by tokenizer chat template. Attaching as first user message instead."
        )
        messages.append({"role": "user", "content": system_prompt})
        messages.append({"role": "assistant", "content": "affirmative"})
    logging.info(
        f"Starting new conversation with system prompt: {Colors.GREEN}{system_prompt}{Colors.RESET }"
    )
    return messages


def detect_system_role_support(tokenizer, pipe):
    """Detect if the current model/pipeline supports system role."""
    try:
        test_messages = [
            {"role": "system", "content": "test"},
            {"role": "user", "content": "hi"},
        ]
        pipe(test_messages, max_new_tokens=2)
        return True
    except Exception as e:
        logging.debug(f"System role test failed: {e}")
        return False


def interactive_mode(args):
    """Run the chatbot in interactive mode."""
    model_id = models[args.model]
    tokenizer, pipe = initialize_model_and_tokenizer(model_id)
    system_role_supported = detect_system_role_support(tokenizer, pipe)
    global messages
    system_prompt = load_system_prompt()
    messages = new_conversation(tokenizer, system_prompt, system_role_supported)

    print("")
    print("Starting chat. Press Ctrl-D to exit.")

    while True:
        try:
            # Get user input
            prompt = f"> {Colors.BLUE}"
            user_input = input(prompt)

            # Append user message to the history
            messages.append({"role": "user", "content": user_input})

            # Generate response
            outputs = pipe(
                messages,
                do_sample=True,
                temperature=0.7,  # Higher temperature for more randomness
                top_p=0.9,  # Nucleus sampling
            )

            # Extract the assistant's reply
            assistant_reply = outputs[0]["generated_text"][-1]["content"]
            print(
                f"{Colors.RESET}< {Colors.GREEN}{assistant_reply}{Colors.RESET}"
            )

            # Append assistant's reply to the history for context in the next turn
            messages.append({"role": "assistant", "content": assistant_reply})

        except (EOFError, KeyboardInterrupt):
            # User pressed Ctrl-D or Ctrl-C
            print(f"\n{Colors.RESET}Chat closed!")
            break


def web_mode(args):
    """Run the chatbot as a Flask web server."""
    import os

    from flask import (
        Flask,
        jsonify,
        make_response,
        request,
        send_from_directory,
    )

    def set_cors_headers(resp, methods):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = methods
        return resp

    model_id = models[args.model]
    tokenizer, pipe = initialize_model_and_tokenizer(model_id)
    system_role_supported = detect_system_role_support(tokenizer, pipe)
    import uuid

    # Store conversations by id
    conversations = {}

    # Serve static files from the project root
    app = Flask(
        __name__, static_folder=os.path.abspath("webroot"), static_url_path=""
    )

    # Catch-all static file route (serves any file from webroot as /)
    @app.route("/")
    def serve_index():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/game")
    def serve_game():
        return send_from_directory(app.static_folder, "game/index.html")

    @app.route("/<path:filename>")
    def serve_static(filename):
        # If requesting index.html or root, serve index.html
        if filename == "" or filename == "index.html":
            return send_from_directory(app.static_folder, "index.html")
        # Otherwise, serve the requested file from webroot
        return send_from_directory(app.static_folder, filename)

    # Chat endpoint
    @app.route("/api/chat/<chat_id>", methods=["POST", "OPTIONS"])
    def chat(chat_id):
        if request.method == "OPTIONS":
            resp = make_response()
            return set_cors_headers(resp, "POST, OPTIONS")
        if not request.is_json:
            resp = make_response(
                jsonify({"error": "Content-Type must be application/json"}), 415
            )
            return set_cors_headers(resp, "POST, OPTIONS")
        data = request.get_json()
        user_prompt = data.get("prompt")
        if not user_prompt or not isinstance(user_prompt, str):
            resp = make_response(
                jsonify(
                    {
                        "error": 'JSON body must contain a "prompt" key with a string value.'
                    }
                ),
                400,
            )
            return set_cors_headers(resp, "POST, OPTIONS")
        with messages_lock:
            if chat_id not in conversations:
                resp = make_response(
                    jsonify({"error": "Invalid chat id."}), 404
                )
                return set_cors_headers(resp, "POST, OPTIONS")
            logging.info(f"User prompt: {user_prompt} (chat_id={chat_id})")
            messages = conversations[chat_id]
            messages.append({"role": "user", "content": user_prompt})
            try:
                outputs = pipe(
                    messages,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                )
                assistant_reply = outputs[0]["generated_text"][-1]["content"]
                messages.append(
                    {"role": "assistant", "content": assistant_reply}
                )
                resp = make_response(jsonify({"reply": assistant_reply}))
                return set_cors_headers(resp, "POST, OPTIONS")
            except Exception as e:
                resp = make_response(jsonify({"error": str(e)}), 500)
                return set_cors_headers(resp, "POST, OPTIONS")

    @app.route("/api/reset", methods=["POST", "OPTIONS"])
    def reset():
        if request.method == "OPTIONS":
            resp = make_response()
            return set_cors_headers(resp, "POST, OPTIONS")
        data = request.get_json()
        system_prompt = data.get("system_prompt")

        chat_id = str(uuid.uuid4())
        with messages_lock:
            conversations[chat_id] = new_conversation(
                tokenizer, system_prompt, system_role_supported
            )
        resp = make_response(
            jsonify({"status": "reset", "chat_id": chat_id}), 200
        )
        return set_cors_headers(resp, "POST, OPTIONS")

    # API info route
    @app.route("/api/info", methods=["GET", "OPTIONS"])
    def api_info():
        """Return API usage information."""
        if request.method == "OPTIONS":
            resp = make_response()
            return set_cors_headers(resp, "GET, OPTIONS")
        resp = make_response(
            jsonify(
                {
                    "endpoints": [
                        {
                            "path": "/api/info",
                            "methods": ["GET", "OPTIONS"],
                            "description": "Get API usage information.",
                        },
                        {
                            "path": "/api/reset",
                            "methods": ["POST", "OPTIONS"],
                            "description": "Reset the conversation and get a chat id.",
                        },
                        {
                            "path": "/api/chat/<chat_id>",
                            "methods": ["POST", "OPTIONS"],
                            "description": "Send a prompt and get a reply for a specific chat id. JSON: { 'prompt': <string> }",
                        },
                    ],
                    "prompt_format": {"prompt": "<string>"},
                }
            )
        )
        return set_cors_headers(resp, "GET, OPTIONS")

    app.run(host="0.0.0.0", port=args.port, debug=False)


try:
    import readline
except ImportError:
    pass  # readline is built-in on Linux/macOS, optional on Windows

if __name__ == "__main__":
    args = parse_args()
    if args.web_mode:
        logging.info("Enabling web mode.")
        web_mode(args)
    else:
        interactive_mode(args)
