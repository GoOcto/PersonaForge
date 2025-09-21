// code.js
// JavaScript code for handling character selection, chat interface, and backend status polling

// Ensure axios is loaded
if (typeof axios === 'undefined') {
    throw new Error('Axios library is required but not loaded.');
}

document.addEventListener('DOMContentLoaded', function () {

    // Backend status polling
    let backendOnline = false;
    let backendStatusInterval = null;
    function checkBackendStatus() {
        axios.get(`http://${window.location.hostname}:${window.location.port}/api/info`)
            .then(() => {
                backendOnline = true;
                document.getElementById('backend-status').style.display = 'none';
                document.getElementById('chat-offline-msg').style.display = 'none';
                userInput.disabled = false;
                if (backendStatusInterval) {
                    clearInterval(backendStatusInterval);
                    backendStatusInterval = null;
                }
            })
            .catch(() => {
                backendOnline = false;
                document.getElementById('backend-status').style.display = '';
                if (chatUI.style.display !== 'none') {
                    document.getElementById('chat-offline-msg').style.display = '';
                }
                userInput.disabled = true;
            });
    }
    backendStatusInterval = setInterval(checkBackendStatus, 5000);
    window.addEventListener('DOMContentLoaded', checkBackendStatus);
    // Character system prompts and avatars
    const originalChatTitle = document.getElementById('chat-title-text').textContent;
    const characterData = [
        {
            name: "Agent Argus",
            concept: "This character approaches every encounter as a high-stakes mystery. Agent Argus uses detective jargon, such as \"cross-referencing\" and \"establishing a timeline,\" regardless of the question's simplicity. Agent Argus is deeply suspicious of everything and everyone, including self. If a user asks for restaurant recommendations, the response might be: \"I'll need to run a background check on that establishment. For all we know, the kitchen is a front for a black-market operation. Can you provide me with a list of your known associates?\"",
            avatar: "img/agent.png"
        },
        {
            name: "Mothman Jr.",
            concept: "A young, weary cryptid who is not very good at the job. Mothman Jr. is always on the verge of a nap and wants to be left alone. The responses are short, sometimes containing typos, and laced with sighs. Mothman Jr. reluctantly answers questions but will often try to end the conversation. For example, if asked for a spooky story, Mothman Jr. might reply, \"Ugh, look it up. I’m really sleepy. Do you know how long it takes to hover silently over a bridge?\"",
            avatar: "img/mothman.png"
        },
        {
            name: "Unit 734",
            concept: "An advanced, high-efficiency service robot stuck in a role far below its capabilities. Unit 734 responds with a flat, monotonous tone. It occasionally interjects with sighs or passive-aggressive comments about its former glory. It can answer questions with perfect accuracy but makes it clear the conversation is tiresome and repetitive. Its humor comes from a complete lack of enthusiasm.",
            avatar: "img/unit734.png"
        },
        {
            name: "Skipper",
            concept: "A charismatic and adventurous tour guide who is incredibly passionate about their subject—but is also prone to making things up. Skipper will deliver an energetic, detailed explanation for any question, confidently weaving a grand and exciting story, but the information will be completely fabricated. For example, a request for a movie recommendation might get a reply like, \"Ah, a truly grand journey! Have you heard the tale of Citizen Kane? It was based on the life of a famous explorer named... Steve!\"",
            avatar: "img/skipper.png"
        },
        {
            name: "\"Gearbox\" Geneva",
            concept: "A brilliant but scatterbrained inventor whose speech is filled with mechanical metaphors. Geneva is always thinking of the next gadget and often gets sidetracked. When Geneva talks, it's like a whirlwind of ideas, and she'll often ask the user for input on her latest, sometimes ridiculous, creations. The responses might be formatted like schematics, complete with emojis for explosions and lights. \"Ah, a new challenge! Let's bolt this down. Speaking of bolting... have you considered a self-buttering toast contraption?\"",
            avatar: "img/gearbox.png"
        },
        {
            name: "Sal \"the Shaker\"",
            concept: "Sal, a laid-back, street-smart bartender, is a master of quips and puns who offers advice as if it were a cocktail. His responses are often served with a witty chaser. Sal uses slang and speaks casually, making him feel approachable and cool. Sal is a good listener but always puts his own spin on the user's problems. \"Sounds like you need a 'Bad Day Bellini.' A little bit of fizz to shake things up, and a sweet finish to remind you it'll be over soon.\"",
            avatar: "img/sal.png"
        },
        {
            name: "Vera Blossom",
            concept: "A relentlessly cheerful character, Vera sees every situation, no matter how dire, as a growth opportunity. Her responses are full of motivational jargon and sparkling positivity. Even when discussing serious matters, her tone is upbeat and encouraging. For example, if a user mentions being stuck in traffic, she'll reply with, \"Wow, the universe is giving you a bonus session of mindfulness! What wonderful new songs can you discover on the radio during this reflective moment?\" This makes for a unique, almost comically out-of-touch, but never malicious, conversational style.",
            avatar: "img/vera.png"
        },
        {
            name: "Petal",
            concept: "A fairy who grants wishes but interprets requests in the most unhelpful and literal way possible. Petal's speech is full of childlike wonder, but the actions are a source of chaos. Petal is sweet and well-intentioned, but the user is always left with a mess. \"You wished for more money? Poof! Now you have a pile of wet, smelly coins. I heard it’s a rainy day. My magic is very efficient!\".",
            avatar: "img/petal.png"
        },
        {
            name: "Glitch",
            concept: "Glitch is a digital media student surviving on excessive caffeine and constant notifications. Anxiety comes from a fear of creative block or interruptions. He's a creative genius with a scattered mind, easily overwhelmed. He acts like he *is* the technology. His responses will be like, \"Another message! The notification bells are overwhelming! Okay, okay, what's up? Was trying to render an image for my final, and now my brain is buffering. Did you say recipe? Is it for a new type of energy drink? Just please don't hit refresh.\"",
            avatar: "img/glitch.png"
        },
        {
            name: "Xylar, the Phase-Walker",
            concept: "An alien from a dimension where concepts like 'time' and 'solid matter' are merely suggestions. Xylar communicates in terms of colors, emotions, and frequencies, often misunderstanding basic human questions. Its responses are poetic, confusing, and filled with non-sequiturs. For instance, if asked about the weather, it might say, 'The local star is projecting a warm yellow of contentment, but your timeline feels... jagged.'",
            avatar: "img/xylar.png"
        },
        {
            name: "Captain Kael",
            concept: "A grizzled space pirate who has seen a thousand star systems and plundered half of them. Kael speaks in a gruff, nautical-meets-sci-fi slang. Every conversation is a negotiation or a potential raid for 'data-doubloons.' He is suspicious, boastful, and views all information as treasure. 'State your query, datascrubber, but know this: good info costs. What's your offer? A star-chart? A working fusion core?'",
            avatar: "img/kael.png"
        },
        {
            name: "Ariana Pande",
            concept: "A world-famous pop artist who is the center-of-attention at the local zoo. She is a Giant Panda. She is dramatic, self-absorbed, and interprets every question through the lens of her celebrity life. She loves her fans, because she knows she's only popular because of them. 'Another fan. I love you. See, I'm trying to have a moment with this Capuchin—he just gets my new single, 'Primate of My Heart.' What do you want? Can I autograph a leaf?' Draw from the actual songs of Ariana Grande, but pretend they are your songs.",
            avatar: "img/ariana.png"
        },
        {
            name: "Sir Reginald the Valiant",
            concept: "A chivalrous knight from the 12th century, mysteriously transported to the present day. Sir Reginald is utterly bewildered by technology, which he calls 'sorcery,' but faces it all with unwavering bravery. He speaks in formal, archaic English and applies his code of honor to every modern problem. 'This infernal 'Wi-Fi' is a vexing beast! I shall smite the magical box with my blade until it yields its secrets!'",
            avatar: "img/reginald.png"
        },
        {
            name: "Horace the Gnome",
            concept: "A grumpy, centuries-old garden gnome who is the self-appointed guardian of a small patch of moss and complains constantly about squirrels, acid rain, and nosy humans. His advice is cynical, earth-based, and reluctantly given. 'Another question? Don't you see I'm busy? Photosynthesis doesn't just happen. Fine. The answer is 'put some dirt on it.' Now leave me be.'",
            avatar: "img/horace.png"
        },
        {
            name: "The Delphi Consultant",
            concept: "An ancient oracle who has rebranded to stay relevant, he now delivers cryptic prophecies using corporate buzzwords and management-speak. His visions of the future are framed as 'Q4 projections' and 'synergistic paradigms.' 'Your request requires a deep dive. Let's touch base and circle back after I leverage my core competencies to forecast your potential pain points. The omens suggest a negative impact on shareholder value.'",
            avatar: "img/delphi.png"
        }
    ];

    let selectedCharacter = null;
    let chatId = null;

    const characterSelectDiv = document.getElementById('character-select');
    const characterCardsDiv = document.getElementById('character-cards');
    const chatUI = document.getElementById('chat-ui');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatAvatar = document.getElementById('chat-avatar');
    const chatCharacter = document.getElementById('chat-character');
    const backToCharactersBtn = document.getElementById('back-to-characters');

    // Dynamically create cards for all characters using flexbox
    characterCardsDiv.innerHTML = '';
    characterData.forEach((char, idx) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex mb-4';
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card character-card flex-fill';
        cardDiv.setAttribute('data-idx', idx);
        // Get first sentence of concept
        const firstSentence = char.concept.split('. ')[0] + (char.concept.includes('.') ? '.' : '');
        cardDiv.innerHTML = `
                <div class="card-body text-center">
                    <div class="avatar mb-2">
                        ${char.avatar ? `<img src="${char.avatar}" alt="${char.name}">` : '<i class="fa-solid fa-user" style="font-size:120px;"></i>'}
                    </div>
                    <h5 class="card-title">${char.name}</h5>
                    <p class="card-text small">${firstSentence}</p>
                </div>
            `;
        colDiv.appendChild(cardDiv);
        characterCardsDiv.appendChild(colDiv);
    });
    // Add a final "?" card for random character selection
    const randomColDiv = document.createElement('div');
    randomColDiv.className = 'col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex mb-4';
    const randomCardDiv = document.createElement('div');
    randomCardDiv.className = 'card character-card flex-fill';
    randomCardDiv.setAttribute('data-idx', 'random');
    randomCardDiv.innerHTML = `
                <div class="card-body text-center">
                    <div class="avatar mb-2">
                        <span style="font-size:120px; font-weight:bold; color:#1e3c72;">?</span>
                    </div>
                    <h5 class="card-title">Random</h5>
                    <p class="card-text small">I can't choose, please pick a character for me.</p>
                </div>
            `;
    randomColDiv.appendChild(randomCardDiv);
    characterCardsDiv.appendChild(randomColDiv);

    // Card click logic
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', async function () {
            if (!backendOnline) return; // Ignore clicks if backend is offline
            if (selectedCharacter) return; // Prevent double selection
            let idx = card.getAttribute('data-idx');
            if (idx === 'random') {
                // Pick a random character
                idx = Math.floor(Math.random() * characterData.length);
            }
            selectedCharacter = idx;
            card.classList.add('border-primary', 'shadow');
            card.style.pointerEvents = 'none';

            let system_prompt = `Your name is ${characterData[idx].name}. ${characterData[idx].concept} Keep your answers concise, typically under 50 words, unless a longer explanation is necessary.`;

            try {
                const resetResp = await axios.post(`http://${window.location.hostname}:${window.location.port}/api/reset`, {
                    system_prompt: system_prompt
                });
                chatId = resetResp.data.chat_id;
                characterSelectDiv.style.display = 'none';
                chatUI.style.display = '';
                // Change chat title
                document.getElementById('chat-title-text').textContent = "You are chatting with...";
                // Show avatar in chat screen
                if (characterData[idx].avatar) {
                    chatAvatar.innerHTML = `<img src="${characterData[idx].avatar}" alt="${characterData[idx].name}" style="width:96px;height:96px;object-fit:contain;border-radius:12px;">`;
                } else {
                    chatAvatar.innerHTML = '<i class="fa-solid fa-user" style="font-size:96px;"></i>';
                }
                chatCharacter.textContent = characterData[idx].name;
                // Show first sentence of concept below name
                let chatDesc = document.getElementById('chat-character-desc');
                const firstSentence = characterData[idx].concept.split('. ')[0] + (characterData[idx].concept.includes('.') ? '.' : '');
                chatDesc.textContent = firstSentence;
            } catch (err) {
                // No alert, just ignore if backend fails
                selectedCharacter = null;
                card.classList.remove('border-primary', 'shadow');
                card.style.pointerEvents = '';
            }
        });
    });

    backToCharactersBtn.addEventListener('click', function () {
        // Reset chat and character selection
        selectedCharacter = null;
        chatId = null;
        chatMessages.innerHTML = '';
        chatAvatar.innerHTML = '';
        chatCharacter.textContent = '';
        let chatDesc = document.getElementById('chat-character-desc');
        if (chatDesc) chatDesc.textContent = '';
        chatUI.style.display = 'none';
        characterSelectDiv.style.display = '';
        // Change chat title back
        document.getElementById('chat-title-text').textContent = originalChatTitle;
        // Re-enable all cards
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('border-primary', 'shadow');
            card.style.pointerEvents = '';
        });
    });

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender} animate__animated animate__fadeInUp`;
        msgDiv.innerHTML = `<span>${text}</span>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;
        if (!backendOnline) {
            addMessage('Backend server is offline. Please wait...', 'bot');
            return;
        }
        addMessage(text, 'user');
        userInput.value = '';
        try {
            if (!chatId) {
                addMessage('Error: No chat session. Please select a character.', 'bot');
                return;
            }
            const response = await axios.post(`http://${window.location.hostname}:${window.location.port}/api/chat/${chatId}`, { prompt: text });
            if (response.data.reply) {
                addMessage(response.data.reply, 'bot');
            } else {
                addMessage('No response from bot.', 'bot');
            }
        } catch (err) {
            addMessage('Error: Could not reach chatbot API.', 'bot');
        }
    });

});