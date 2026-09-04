'use strict';
// Static game data — loaded before Babel to reduce transpilation size

    const ADVENTURE_LIBRARY = [
      {
        id: 'crash_on_volturnus',
        title: 'Dravoss Lost',
        tagline: 'When your shuttle goes down on a hostile alien world with no comms and no rescue window, survival means earning the trust of the locals, if they decide you\'re worth the trouble.',
        genre: 'Survival / First Contact',
        difficulty: 'Beginner',
        act_summary: {
          act1: 'Survive the crash site and make first contact with Dravoss natives.',
          act2: 'Navigate tribal politics while uncovering a Vrethak scouting operation.',
          act3: 'Destroy the Vrethak beacon before reinforcements arrive.'
        },
        setting: 'Planet Dravoss, Nethaan system',
        tone: ['Survival', 'Discovery', 'Desperate'],
        recommended_characters: 'any',
        cover_icon: 'Globe'
      },
      {
        id: 'ghost_station',
        title: 'Ghost Station',
        tagline: 'Station Vorrex\'s distress beacon has been running for six weeks, but the crew stopped responding before it started. Something is still aboard, and it\'s had plenty of time to prepare for visitors.',
        genre: 'Cosmic Horror',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Board the silent research station and discover what happened to the crew.',
          act2: 'Something is still aboard -- and it is hunting you.',
          act3: 'Survive long enough to broadcast a warning and escape.'
        },
        setting: 'Abandoned orbital research station',
        tone: ['Dread', 'Mystery', 'Claustrophobic'],
        recommended_characters: 'any',
        cover_icon: 'AlertCircle'
      },
      {
        id: 'the_triad_job',
        title: 'The Nexus Job',
        tagline: 'A clean extraction job in a megacity built on corporate secrets: get the chip, get out, get paid. Nobody mentioned the other contractors.',
        genre: 'Corporate Espionage',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Accept a data extraction contract from a mysterious broker on Bruviix.',
          act2: 'Navigate rival corporate security and a double-cross mid-heist.',
          act3: 'Escape the megacity with the package and your lives.'
        },
        setting: 'Bruviix, megacity arcologies',
        tone: ['Tense', 'Political', 'High-Stakes'],
        recommended_characters: 'any',
        cover_icon: 'Briefcase'
      },
      {
        id: 'the_golden_mandible',
        title: 'The Vorath Claw',
        tagline: 'A priceless krix relic sits in a museum with embarrassing security, and a broke crew with an objectively perfect plan is about to find out how wrong they are.',
        genre: 'Comedy Heist',
        difficulty: 'Beginner',
        act_summary: {
          act1: 'Learn that a legendary krix relic is on display at Waystation Drun\'s most underfunded museum.',
          act2: 'Execute a heist that goes wrong in increasingly comedic ways.',
          act3: 'Escape with the artifact and somehow everyone\'s friendship intact.'
        },
        setting: 'Waystation Drun, Valdren Prime',
        tone: ['Comedic', 'Chaotic', 'Heist'],
        recommended_characters: 'any',
        cover_icon: 'Star'
      },
      {
        id: 'the_erebus_protocol',
        title: 'The Solvax Protocol',
        tagline: 'A dead SFC agent\'s final transmission leads to coordinates on no official chart and an installation that doesn\'t officially exist. Neither does what\'s inside.',
        genre: 'Conspiracy Thriller',
        difficulty: 'Advanced',
        act_summary: {
          act1: 'A dead SFC agent\'s final message leads to a black-site installation.',
          act2: 'Unravel an Kethara Authority cover-up that implicates the Assembly of Worlds.',
          act3: 'Choose -- expose the truth and shatter the Frontier\'s illusion of safety, or bury it forever.'
        },
        setting: 'Deep space, multiple systems',
        tone: ['Paranoid', 'Cerebral', 'Lethal'],
        recommended_characters: ['kael_voss', 'skrix', 'rayla'],
        cover_icon: 'Eye'
      },
      {
        id: 'sfad5_bugs_in_the_system',
        title: 'Bugs in the System',
        tagline: 'Two hundred colonists disappeared from Waystation Thaak without leaving a single body. The station isn\'t empty. It just doesn\'t have people in it anymore.',
        genre: 'Sci-Fi Horror',
        difficulty: 'Advanced',
        act_summary: {
          act1: 'Dock at Waystation Thaak. Something is wrong. Find out what happened to the colonists.',
          act2: 'The station is not empty. Survivors are barricaded. The threat is still active.',
          act3: 'Reach the source. Every option available comes with a cost.'
        },
        setting: 'Thaak Mining Station, asteroid belt',
        tone: ['Horror', 'Isolation', 'Moral Ambiguity'],
        recommended_characters: ['kael_voss', 'skrix', 'bolg'],
        cover_icon: 'AlertCircle'
      },
      {
        id: 'sf4_mission_to_alcazzar',
        title: 'Mission to Kelvaax',
        tagline: 'A simple documentation job: observe Dolvex Group\'s illegal mining operation on a frozen frontier world, then come home. The drill points at ice, not ore. Now Dolvex Group has decided you won\'t be leaving.',
        genre: 'Corporate Noir',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'IEC hires you to document Dolvex Group\'s illegal mining on Kelvaax. Simple observation.',
          act2: 'Dolvex Group is digging for an ancient ship buried in the ice. Someone is watching.',
          act3: 'Corporate war erupts. You hold the secret. Choose a side. Or claim it yourself.'
        },
        setting: 'Kelvaax, frozen frontier world',
        tone: ['Cold', 'Calculating', 'Corporate'],
        recommended_characters: ['kael_voss', 'skrix', 'rayla'],
        cover_icon: 'Briefcase'
      },
      {
        id: 'sf3_sundown_on_starmist',
        title: 'Sundown on Suvaan',
        tagline: 'Deep in Suvaan\'s warm canyons, a primitive tribe guards a structure built from materials no civilization on this world has ever worked. Someone got inside before your team, and they\'re still there.',
        genre: 'Ancient Mystery',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Land in Suvaan\'s warm canyons. A local guide leads you to something that has no explanation.',
          act2: 'You are not the first inside. Others arrived before you, and their intentions are hostile.',
          act3: 'Follow the threat to its source before it is too late to matter.'
        },
        setting: 'Suvaan, canyon world',
        tone: ['Mystery', 'Ancient Power', 'The Vrethak Threat'],
        recommended_characters: ['kael_voss', 'bolg', 'rayla'],
        cover_icon: 'Globe'
      },
      {
        id: 'sfkh1_dramune_run',
        title: 'Tholvarn Run',
        tagline: 'Stranded in the Tholvarn system with a broken ship and cargo you were paid not to open, you quickly realize that everyone who wants what\'s in the hold won\'t be asking nicely.',
        genre: 'Space Western Noir',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Stranded in the Tholvarn system with a broken ship, mounting debts, and cargo you were paid not to inspect.',
          act2: 'Too many people want what you have. Figure out why before they stop asking politely.',
          act3: 'Make your play in the lawless Outer Reach, but every option has buyers and consequences.'
        },
        setting: 'Tholvarn system, Inner and Outer Reach',
        tone: ['Paranoid', 'Gritty', 'Morally Gray'],
        recommended_characters: ['kael_voss', 'skrix', 'rayla'],
        cover_icon: 'Star'
      },
      {
        id: 'sf1_volturnus_planet_of_mystery',
        title: 'Return to Dravoss',
        tagline: 'A survey team vanished somewhere in the wilderness of Dravoss, and the local tribes know exactly what happened. They won\'t say. The answer is somewhere they refuse to follow.',
        genre: 'Exploration & Discovery',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Earn the trust of the Selvaan to learn where the lost explorers were taken.',
          act2: 'Find the explorers and discover what the Zekkari are actually guarding.',
          act3: 'The truth about Dravoss is larger than anyone expected. So is the threat arriving to silence it.'
        },
        setting: 'Dravoss, Nethaan system',
        tone: ['Exploratory', 'Revelatory', 'Epic'],
        recommended_characters: ['bolg', 'skrix', 'rayla'],
        cover_icon: 'Globe'
      },
      {
        id: 'dark_side_of_the_moon',
        title: 'Dark Side of the Moon',
        tagline: 'You\'re a journalist on Dorrath to cover a routine ceremony, but the story that breaks isn\'t the one you came to file, and it\'s already put you in the middle of something much worse.',
        genre: 'Political Thriller',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Cover the Threnvar-Hollis Prize ceremony on Dorrath. It does not go as planned.',
          act2: 'Investigate what really happened. The official story has problems. So does every alternative.',
          act3: 'Follow the evidence to its end and decide what a journalist does when the truth could start a war.'
        },
        setting: 'Dorrath, Brethis system',
        tone: ['Moral Complexity', 'Investigative', 'Tense'],
        recommended_characters: 'any',
        cover_icon: 'Eye'
      },
      {
        id: 'need_to_know',
        title: 'Burn After Reading',
        tagline: 'SFC Internal Security needs a missing document recovered. The archivist who accessed it is dead, so is the investigator sent after her, and your handler says don\'t read it under any circumstances.',
        genre: 'Paranormal Investigation',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Accept the job. Investigate two impossible deaths.',
          act2: 'Follow the pattern to the meeting at Waystation Null.',
          act3: 'Confront what the document contains, and what has been reading the people who read it.'
        },
        setting: 'Multiple SFC worlds, Waystation Null',
        tone: ['Paranoid', 'Dread', 'Unknowable'],
        recommended_characters: 'any',
        cover_icon: 'Eye'
      },
      {
        id: 'the_long_sleep',
        title: 'The Long Goodnight',
        tagline: 'The cryo-freighter Somnus is drifting intact with all twelve crew members alive, healthy, and smiling. None of them will look at the cargo hold.',
        genre: 'Cosmic Horror',
        difficulty: 'Intermediate',
        act_summary: {
          act1: 'Board the drifting Somnus. Find the crew dreaming in synchronized bliss.',
          act2: 'Cut open Cargo Hold 7. Discover the alien organism and the woman wired into it.',
          act3: 'Decide the fate of five hundred sleeping passengers and the dreamer who loves them.'
        },
        setting: 'Cryo-freighter Somnus, deep space',
        tone: ['Surreal', 'Claustrophobic', 'Dread'],
        recommended_characters: 'any',
        cover_icon: 'AlertCircle'
      },
      {
        id: 'the_replacement',
        title: 'The Replacements',
        tagline: 'Two senior administrators on a high-security core world have each accused the other of being a Vrethak infiltrator, and your job is to find out who\'s lying. The evidence is unusually easy to find. That\'s exactly the problem.',
        genre: 'Paranoid Spy Thriller',
        difficulty: 'Advanced',
        act_summary: {
          act1: 'Interview two administrators who cannot be in the same room. Both stories are credible.',
          act2: 'Search their quarters. Notice why the evidence is so easy to find.',
          act3: 'Survive the moment both infiltrators reveal themselves, and the triple agent between them.'
        },
        setting: "Thyss's Reach, SFC core systems",
        tone: ['Paranoid', 'Cerebral', 'Lethal'],
        recommended_characters: ['kael_voss', 'skrix', 'bolg'],
        cover_icon: 'Eye'
      },
      {
        id: 'major_major_minor',
        title: 'MAJOR MAJOR MINOR',
        tagline: 'A routine audit assignment at a decommissioned administrative outpost on the edge of mapped space. Please complete Form 27B/6 upon arrival.',
        genre: 'Bureaucratic Horror',
        difficulty: 'Advanced',
        act_summary: {
          act1: 'File your forms. Audit the impossible budget. Meet Vervain. Notice the 47-second flicker.',
          act2: 'Find the pension payments. Open the NO ENTRY door. See what the budget has been funding.',
          act3: 'Destroy the server. Watch Vervain die. Wake up in the chair. The escape was a simulation layer.'
        },
        setting: 'Station MAJOR MAJOR MINOR, Edge of Void Sector 7',
        tone: ['Absurdist', 'Paranoid', 'Existential Dread'],
        recommended_characters: 'any',
        cover_icon: 'Briefcase'
      }
    ];

    // SECTION 3h2 -- ADVENTURE MODULES
    const ADVENTURE_MODULES = {
      crash_on_volturnus: {
        synopsis: "You are a passenger whose shuttle has crashed on Dravoss. Escape the wreck, survive the alien desert, make first contact with the Drav'Kor, and retrieve a stolen tribal artifact to earn safe passage.",
        ai_instructions: {
          tone: "Immersive narrator, second person present tense",
          pacing: "1-2 paragraphs per response, then prompt for action",
          themes: ["Survival", "First contact", "Alien world wonder", "Earning trust"]
        },
        scenes: [
          {
            id: "scene_1_wake_up",
            x: 2, y: 0,
            title: "The Wreck",
            type: "introduction",
            description: "You awaken to chaos. The shuttle is on its side. Emergency lighting casts everything in red. Smoke burns your eyes. Three other survivors are stirring: a human medic named Dr. Orvaine, a krix engineer named Vriktik, and a moluun merchant named Squelb. The shuttle's hull is breached. Fire spreads from the engine compartment.",
            objective: "Escape the burning wreck and assess the situation.",
            npcs_present: [
              { name: "Dr. Mira Orvaine", role: "Medic", attitude: "Helpful, slightly panicked" },
              { name: "Vriktik", role: "Engineer", attitude: "Practical, business-like" },
              { name: "Squelb", role: "Merchant", attitude: "Nervous, wants to negotiate even now" }
            ],
            exits: [{ to: "scene_2_desert", description: "Stumble out into harsh purple daylight" }]
          },
          {
            id: "scene_2_desert",
            x: 2, y: 1,
            title: "The Purple Desert",
            type: "exploration",
            description: "You stand in an alien desert. The sand is purple. Two suns beat down mercilessly. The shuttle smolders behind you. To the north: rocky hills and what looks like ruins. To the east: a canyon. To the south: open desert. Strange cries echo from the rocks.",
            objective: "Find shelter, water, and signs of civilization.",
            npcs_present: [],
            exits: [
              { to: "scene_3_canyon", description: "Canyon with cave to the east" },
              { to: "scene_4_ruins", description: "Rocky hills with ruins to the north" },
              { to: "scene_5_ulmor", description: "Open desert south: follow Strider herd or travel south 4+ hours" }
            ]
          },
          {
            id: "scene_3_canyon",
            x: 3, y: 2,
            title: "The Water Cave",
            type: "shelter",
            description: "A narrow canyon opens into a small cave. Water seeps from the rock wall into a pool. It's cool here. But you're not alone. In the shadows, something moves.",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_2_desert", description: "Back to desert" },
              { to: "scene_5_ulmor", description: "Follow canyon south into Drav'Kor territory" }
            ]
          },
          {
            id: "scene_4_ruins",
            x: 1, y: 2,
            title: "Ancient Ruins",
            type: "exploration",
            description: "Crumbling stone walls covered in strange glyphs. This was a city once. Now it's home to scavengers. You find a cache of supplies left by previous explorers. Or previous crash victims.",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_2_desert", description: "Return to desert" },
              { to: "scene_5_ulmor", description: "Tracks lead south to inhabited area" }
            ]
          },
          {
            id: "scene_5_ulmor",
            x: 2, y: 3,
            title: "First Contact",
            type: "social",
            description: "You crest a dune and see them: octopus-like beings riding large six-legged beasts (striders). They wear leather harnesses and carry spears and strange projectile weapons. One raises a hand in greeting. Or warning. This is the Drav'Kor tribe.",
            objective: null,
            npcs_present: [
              { name: "Chieftain Vel-Dun", role: "Tribal Leader", attitude: "Cautious but curious" },
              { name: "Shaman Vel-Shai", role: "Spiritual Leader", attitude: "Suspicious, watches for signs" }
            ],
            exits: [
              { to: "scene_6_caves", description: "Accept quest: Ul-Mai marks cave entrance on your map" },
              { to: "scene_2_desert", description: "Refuse or leave: they point toward the distant mountains" }
            ]
          },
          {
            id: "scene_6_caves",
            x: 2, y: 4,
            title: "The Selvaan Caves",
            type: "dungeon",
            description: "A maze of tunnels carved into red rock. The Selvaan are small, ape-like creatures who live in the dark. They stole the Veth Lance, but they fear something deeper in the caves, something that drove them to the upper levels.",
            objective: null,
            npcs_present: [
              { name: "Dav-Rok", role: "War Chief", attitude: "Aggressive but cowardly if outmatched" }
            ],
            exits: [{ to: "scene_7_return", description: "Return to Drav'Kor with the Spear" }]
          },
          {
            id: "scene_7_return",
            x: 2, y: 5,
            title: "Victory and Departure",
            type: "resolution",
            description: "You return the Veth Lance to Chieftain Vel-Dun. The tribe celebrates with a feast. You have made allies on this strange world. Ul-Mai guides you to the starport. Three days. A IEC patrol ship rescues you. As you leave orbit, The Vrethak vessels enter the system.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          ul_mor: { role: "Tribal allies, strider riders", motivation: "Protect tribe and sacred artifacts" },
          kurabanda: { role: "Cave-dwelling thieves", motivation: "Territorial, superstitious, cowardly if losing" },
          razorback: { role: "Desert apex predator", motivation: "Ambush prey from sand" }
        }
      },
      ghost_station: {
        synopsis: "A 20-year-old distress signal leads to an abandoned station. Something killed the crew and it may still be there. An unknowable alien artifact drives observers mad with visions of their own deaths.",
        ai_instructions: {
          tone: "Cosmic horror. Slow dread. Unknown unknowns. Never fully explain the artifact.",
          pacing: "Start slow, build unease. First hour: mystery. Second hour: dread. Third hour: revelation and escape.",
          themes: ["Cosmic horror", "Unknowable alien intelligence", "Survival over victory", "The past consuming the present"]
        },
        scenes: [
          {
            id: "scene_1_docking",
            x: 1, y: 0,
            title: "The Airlock",
            type: "introduction",
            description: "Your ship's sensors confirm: Station Vorrex is dead. No power, no life signs, minimal heat. The station spins slowly, artificial gravity failing. Through the viewport, you see the docking bay: dark, littered with debris. The distress signal repeats every 30 seconds, automated. Someone set it running... and never turned it off.",
            objective: "Board the station, locate the signal source, determine what happened.",
            npcs_present: [
              { name: "Ryn", role: "Engineer (crew)", attitude: "Nervous, superstitious" },
              { name: "Tev", role: "Security (crew)", attitude: "Professional, battle-hardened" }
            ],
            exits: [
              { to: "scene_2_command", description: "Head to command center (elevator shaft, 3 levels up)" },
              { to: "scene_3_quarters", description: "Investigate crew quarters (heat signature location)" },
              { to: "scene_4_lab", description: "Research lab (sealed, emergency power active)" }
            ]
          },
          {
            id: "scene_2_command",
            x: 0, y: 1,
            title: "The Bridge",
            type: "investigation",
            description: "The command center is a frozen tomb. Consoles dead. Captain's chair faces the viewport, overlooking the asteroid field. In it: a skeleton in a pressure suit, hands still gripping the armrests. The captain never left. On the main screen, a single word repeats in all caps: 'SORRY.'",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_3_quarters", description: "Crew quarters" },
              { to: "scene_4_lab", description: "Research lab (sealed door, requires override)" },
              { to: "scene_5_mining", description: "Mining bay (where artifact was found)" }
            ]
          },
          {
            id: "scene_3_quarters",
            x: 1, y: 1,
            title: "Crew Quarters",
            type: "horror",
            description: "Personal quarters are frozen crypts. Family photos on walls. Half-eaten meals, now ice. The heat signature you detected is coming from Cabin 4. The door is warm to the touch. Someone... something... is inside.",
            objective: null,
            npcs_present: [
              { name: "Dr. Petra Halwick", role: "Surviving station chief", attitude: "Catatonic, muttering visions" }
            ],
            exits: [{ to: "scene_4_lab", description: "The lab. Where the artifact waits." }]
          },
          {
            id: "scene_4_lab",
            x: 2, y: 1,
            title: "The Containment Lab",
            type: "climax",
            description: "The lab door is sealed from the outside. Someone trapped whatever was inside. Emergency power flickers here. In the center of the room, under a cracked containment dome: the artifact. It looks like... nothing. A void. A space where something should be but isn't. And it's looking back.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_5_escape", description: "Make decision about artifact" }]
          },
          {
            id: "scene_5_escape",
            x: 1, y: 2,
            title: "The Departure",
            type: "resolution",
            description: "You leave Station Vorrex behind. The station continues its slow spin, the artifact contained or released, depending on your choice. Dr. Halwick's final words echo: 'It shows you things. Things that haven't happened yet.' You check your chronocom. 18 years until the date in your vision.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          dr_elena_voss: { role: "Station Chief Scientist, surviving", motivation: "Warn others, find peace before she dies" },
          jax: { role: "Player's engineer", motivation: "Survive and get home; easily rattled" },
          syl: { role: "Player's security", motivation: "Protect the crew by any means necessary" },
          the_artifact: { role: "Unknowable alien entity/construct", motivation: "Unknown. Possibly feeds on observation." }
        }
      },
      the_triad_job: {
        synopsis: "Corporate espionage on Valdrim. Infiltrate a Varessi Collective data facility, steal quantum drive schematics, and survive the extraction, including a mysterious third party waiting on the roof.",
        ai_instructions: {
          tone: "Cyberpunk noir meets corporate thriller. Tense, atmospheric, paranoia-inducing.",
          pacing: "Build tension. Public areas = safer but slower. Secure areas = dangerous but direct.",
          themes: ["Corporate paranoia", "Moral flexibility", "Time pressure", "Loyalty for sale"]
        },
        scenes: [
          {
            id: "scene_1_briefing",
            x: 1, y: 0,
            title: "The Meet",
            type: "introduction",
            description: "The hotel room is small, damp, and smells of recycled air. Your chronocom buzzes: a message from Agent Nyx. 'Package delivered to locker 47B at Starport Transit. Do not open until you reach the facility. Payment on delivery of data chip. Do not contact me again until job is complete.' Attached: floor plans, security rotations, and a Varessi Collective contractor ID with your face on it.",
            objective: "Review intel, prepare, reach the Varessi Collective Arcology.",
            npcs_present: [],
            exits: [{ to: "scene_2_approach", description: "Head to Varessi Collective Arcology district" }]
          },
          {
            id: "scene_2_approach",
            x: 1, y: 1,
            title: "The Corporate Zone",
            type: "exploration",
            description: "The Varessi Collective Arcology rises 200 stories into Valdrim's smog-choked sky. Its base is a maze of plazas, shops, and security checkpoints. Your fake ID should get you through the public levels. Below that requires... creativity. The building never sleeps.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_3_infiltration", description: "Reach sublevel 12" }]
          },
          {
            id: "scene_3_infiltration",
            x: 1, y: 2,
            title: "Sublevel 12",
            type: "stealth",
            description: "The research level is quiet after hours. White corridors, humming servers, red emergency lighting. You can hear your own heartbeat. The data vault is 50 meters ahead: biometric scanner, two guards, and a motion-sensitive floor. The schematic is in Vault 7.",
            objective: null,
            npcs_present: [
              { name: "Varessi Collective Security Guards (x2)", role: "Vault guards", attitude: "Alert, armed, chatting" }
            ],
            exits: [{ to: "scene_4_extraction", description: "Retrieve data chip" }]
          },
          {
            id: "scene_4_extraction",
            x: 1, y: 3,
            title: "The Getaway",
            type: "action",
            description: "You have the chip. Now you need to reach the roof for extraction. But security knows something's wrong. Alarms blare. Red lights flash. The building goes into lockdown. Your chronocom shows 8 minutes until the drone leaves. With or without you.",
            objective: null,
            npcs_present: [
              { name: "The Broker", role: "Unknown third-party operative", attitude: "Confident, offers double pay, dangerous if refused" }
            ],
            exits: [{ to: "scene_5_aftermath", description: "Reach drone with chip" }]
          },
          {
            id: "scene_5_aftermath",
            x: 1, y: 4,
            title: "Payment and Consequences",
            type: "resolution",
            description: "The drone drops you at a Dolvex Group safehouse in the industrial district. Agent Nyx is there, mandibles clicking with satisfaction. Or calculation. 'The data is authentic. Payment transferred.' Your account shows 5,000 Credits. But you notice Vex recording the transaction.",
            objective: null,
            npcs_present: [
              { name: "Agent Nyx", role: "Dolvex Group handler", attitude: "Professional, calculating, recording everything" }
            ],
            exits: []
          }
        ],
        npcs_reference: {
          agent_vex: { role: "Dolvex Group Corporate Intelligence handler", motivation: "Complete the job; protect Dolvex Group assets above all" },
          the_broker: { role: "Unknown rival operative", motivation: "Acquire the drive schematic for unknown principal" },
          pgc_security: { role: "Corporate guards", motivation: "Protect facility, follow protocols" }
        }
      },
      the_golden_mandible: {
        synopsis: "A comedy heist. Break into a casino to steal a golden statue from the crime lord who framed your mentor. Your crew is eccentric. The security is elaborate. The target is a decoy. The real score is still out there.",
        ai_instructions: {
          tone: "Witty, fast-paced, self-aware. Like a good heist movie with sci-fi flavor.",
          pacing: "Quick scenes, rapid banter, constant momentum. Slow down for character moments.",
          themes: ["Comedy chaos", "Found family", "Justice over profit", "Plans going wrong in the best ways"]
        },
        scenes: [
          {
            id: "scene_1_the_meet",
            x: 1, y: 0,
            title: "A Crew of Questionable Competence",
            type: "introduction",
            description: "Your hideout is a converted storage unit behind a Nebula Chili Parlor. The smell of synthetic peppers permeates everything. You've put out word: you need a crew. The applicants are... special. But desperate times, desperate measures. The Vorath Claw isn't going to steal itself. Probably.",
            objective: "Assemble a crew for the Vorath Claw heist.",
            npcs_present: [
              { name: "Plyx", role: "Shape-shifting infiltration (moluun)", attitude: "Nervous, becomes furniture under stress" },
              { name: "Flux", role: "Tech wizard (skrath)", attitude: "Chronic pessimist, narcoleptic" },
              { name: "Jinx", role: "Social engineering (Human)", attitude: "Cannot stop talking, befriends everyone" },
              { name: "Vrek", role: "Muscle (krix)", attitude: "Pacifist philosopher, quotes ethics mid-heist" }
            ],
            exits: [{ to: "scene_2_the_invitation", description: "Assemble crew, plan the approach" }]
          },
          {
            id: "scene_2_the_invitation",
            x: 1, y: 1,
            title: "Getting on the List",
            type: "social/heist",
            description: "The Grand Nebula Casino doesn't let just anyone into Baron Zhell's private tournament. Entry fee: 100,000 credits. Or an invitation from a current member. Or a really good disguise and a lot of confidence. You have 47 credits and a smile that has gotten you out of worse.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_3_the_tournament", description: "Gain casino access" }]
          },
          {
            id: "scene_3_the_tournament",
            x: 1, y: 2,
            title: "All Eyes on the Game",
            type: "social/comedy",
            description: "Tournament night. The Grand Nebula is packed with Frontier elite. Baron Zhell holds court in the museum, watching the game on holo-screens, the Vorath Claw gleaming behind him. 200 witnesses. 12 guards. 1 very paranoid crime lord. And you, somewhere in the crowd.",
            objective: null,
            npcs_present: [
              { name: "Baron Zhell", role: "Crime lord, target, egomaniac", attitude: "Paranoid, vain, heavily guarded" }
            ],
            exits: [{ to: "scene_4_the_vault", description: "Obtain vault access" }]
          },
          {
            id: "scene_4_the_vault",
            x: 1, y: 3,
            title: "Wobbles and Other Problems",
            type: "stealth/comedy",
            description: "You have the key. The floor is (temporarily) clear. The vault awaits. Between you and 2 million credits: a laser grid, pressure-sensitive floor, biometric scanner, and Wobbles, the attack robot that looks like a teddy bear and kills like a battleship. Also, you have 30 seconds before the key's separation alarm triggers.",
            objective: null,
            npcs_present: [
              { name: "Wobbles", role: "Attack robot / vault guardian", attitude: "Humming contentedly, will kill without hesitation" }
            ],
            exits: [{ to: "scene_5_the_escape", description: "Secure the Mandible" }]
          },
          {
            id: "scene_5_the_escape",
            x: 1, y: 4,
            title: "The Getaway (and the Twist)",
            type: "action/comedy",
            description: "You have the Vorath Claw. Alarms are blaring. Baron Zhell is screaming something about 'the Ghost' and 'unlimited bounty.' Wobbles has woken up and seems personally offended. Twist: the Mandible is a decoy. A message arrives: your mentor is alive. The real one is on Valdrim.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_6_aftermath", description: "Escape with (fake) Mandible" }]
          },
          {
            id: "scene_6_aftermath",
            x: 1, y: 5,
            title: "The Real Score",
            type: "resolution",
            description: "You're back in the Nebula Chili storage unit. The fake Mandible sits in the corner, judging you with its gemstone eyes. Your crew bickers. But you have a new lead: your mentor is alive, the real Mandible is in play, and Baron Zhell has put a 100,000 credit bounty on your head.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          baron_vrix: { role: "Crime lord antagonist", motivation: "Protect his collection; ego above all else" },
          glix: { role: "Infiltration specialist", motivation: "Help the crew; terrified of failing" },
          zap: { role: "Tech wizard", motivation: "Prove his pessimism wrong (secretly)" },
          moxie: { role: "Social chaos engine", motivation: "Befriend everyone, solve everything with words" },
          krik: { role: "Reluctant muscle", motivation: "Help friends while wrestling his philosophical objections to theft" }
        }
      },
      the_erebus_protocol: {
        synopsis: "You wake up with amnesia in a SFC black site. Your hands know how to kill. A countdown says 47 hours until 'Protocol Solvax' activates. You are Subject 7-Alpha, an assassin who started remembering. Stop the activation or become what they made you.",
        ai_instructions: {
          tone: "Paranoid thriller. Trust no one. Every ally is a potential threat. Every threat might be an ally.",
          pacing: "Fast action scenes interspersed with quiet investigation. Never let player feel safe.",
          themes: ["Identity and memory", "Moral ambiguity", "Institutional corruption", "What makes us human"]
        },
        scenes: [
          {
            id: "scene_1_awakening",
            x: 1, y: 0,
            title: "The White Room",
            type: "introduction",
            description: "White ceiling. Antiseptic smell. The beep of a heart monitor. Yours. You sit up. Medical bay. Private room. On the floor: a human doctor in a lab coat, face down, blood pooling. Dead. Your hands are shaking. Not from fear. From adrenaline. Your body knows something your mind doesn't. The door is locked from outside. Alarms scream through the facility.",
            objective: "Escape the medical bay and find an exit.",
            npcs_present: [],
            exits: [{ to: "scene_2_escape", description: "Into the facility. Find an exit. Find answers." }]
          },
          {
            id: "scene_2_escape",
            x: 1, y: 1,
            title: "The Run",
            type: "action",
            description: "The facility is a maze of white corridors and red emergency lights. You pass other rooms, some empty, some with sedated subjects. You're not the only one they worked on. Behind you, security boots. Ahead, an elevator and a stairwell. Level B2: crates labeled 'Solvax Assets: Inactive.' Level B3: retinal scanner. Your eye opens it. You were here before.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_3_surface", description: "Reach ground level or hangar bay" }]
          },
          {
            id: "scene_3_surface",
            x: 1, y: 2,
            title: "The City",
            type: "investigation",
            description: "You're on Valdren Prime. SFC capital. The most surveilled city in the Frontier. Every camera is a threat. Every Kethara Authority officer a potential executioner. Your chronocom buzzes: 'Starlight Lounge. Level 42. Come alone. I knew Dr. Vaskov. I know what you are.' Name: Orven.",
            objective: null,
            npcs_present: [
              { name: "Orven", role: "Ex-Kethara Authority informant", attitude: "Old, scarred, knows everything about Solvax" },
              { name: "Kethara Authority Officer Lorn", role: "Honest cop", attitude: "Suspicious but may be an ally. Or bait." }
            ],
            exits: [{ to: "scene_4_chase", description: "Meeting with Orven completes or is interrupted" }]
          },
          {
            id: "scene_4_chase",
            x: 1, y: 3,
            title: "The Pursuit",
            type: "action",
            description: "They found you. Not Kethara Authority. Worse. Solvax cleanup team. Professionals like you. Three of them. Weapons free. No stun setting this time. Orven pushes you toward the back exit: 'Run! I'll hold them!' He buys you 60 seconds.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_5_triad", description: "Escape Valdren Prime alive" }]
          },
          {
            id: "scene_5_triad",
            x: 1, y: 4,
            title: "The Allies",
            type: "social/investigation",
            description: "Valdrim. Corporate capital. You need to find Subject 5-Gamma, codenamed Lyra, working Dolvex Group tower night security. Another weapon like you. But is she still programmed? Or free like you're trying to be?",
            objective: null,
            npcs_present: [
              { name: "Lyra (Subject 5-Gamma)", role: "Solvax asset, potential ally", attitude: "Paranoid, armed, testing you before lowering her weapon" }
            ],
            exits: [
              { to: "scene_6_vault", description: "Lyra alliance formed: find Dr. Vaskov's research" },
              { to: "scene_7_station_alone", description: "Lyra refuses or player goes solo" }
            ]
          },
          {
            id: "scene_6_vault",
            x: 0, y: 5,
            title: "The Data Heist",
            type: "stealth/action",
            description: "Dr. Vaskov's research is in a Varessi Collective corporate data vault on Valdrim. Lyra has credentials. You have the skills. The vault is underground, biometric-locked, guarded by automated systems and human security. Your retinal scan opens the inner door. You were here before. Inside: Dr. Vaskov's deconditioning protocol. And your real name.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_7_station", description: "Data retrieved" }]
          },
          {
            id: "scene_7_station",
            x: 1, y: 6,
            title: "The Black Site",
            type: "climax",
            description: "The Solvax control station orbits a dead moon. No official registry. 2 hours until activation. Inside: Director Holst, the architect of Solvax, and 12 subjects in cryo ready to deploy. Major Tavin Drell (Subject 9-Beta) blocks your path, programmed to obey but conflicted. You must choose: destroy the signal, free the subjects, kill Crane, or take control.",
            objective: null,
            npcs_present: [
              { name: "Director Holst", role: "Architect of Solvax", attitude: "Believes utterly in his mission; not a monster, a true believer" },
              { name: "Major Tavin Drell", role: "Subject 9-Beta, tragic antagonist", attitude: "Loyal programming vs. returning humanity" }
            ],
            exits: [{ to: "scene_8_aftermath", description: "Choice made. Countdown stopped. Or not." }]
          },
          {
            id: "scene_8_aftermath",
            x: 1, y: 7,
            title: "Who You Are",
            type: "resolution",
            description: "The station burns behind you. Or stands silent. Or serves your will. You made your choice. The countdown stopped. Or it didn't. Either way, you're not Subject 7-Alpha anymore. You're [NAME]. You're alive. And you remember.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          vance: { role: "Ex-Kethara Authority, conspiracy informant", motivation: "Expose Solvax; sacrifices himself to do it" },
          kira: { role: "Fellow Solvax survivor, potential ally", motivation: "Survive and break free of programming" },
          director_crane: { role: "Solvax architect, villain", motivation: "Believes black ops keep the Frontier safe; ends justify means" },
          major_voss: { role: "Programmed antagonist", motivation: "Conflicted between loyalty and recovered humanity" }
        }
      },
      sfad5_bugs_in_the_system: {
        synopsis: "Thaak Mining Station went silent two weeks ago. 200 people. No distress call. RFM is being evasive. Something bio-engineered is nesting inside and you're walking into its hive.",
        ai_instructions: {
          tone: "Sci-fi horror. Alien meets The Thing. Isolation, paranoia, body horror.",
          pacing: "Slow dread building to confrontation. The hive should feel inevitable, ancient, wrong.",
          themes: ["Body horror", "Isolation", "What makes us human", "Moral compromise"]
        },
        scenes: [
          {
            id: "scene_1_approach",
            x: 1, y: 0,
            title: "The Silent Station",
            type: "introduction",
            description: "Waystation Thaak drifts in the asteroid belt, an ugly collection of modules and processing equipment. No running lights. No response to hails. Your ship's sensors show life support active but minimal power to other systems. The docking bay is open. Waiting. Inviting. Or luring.",
            objective: "Board the station and assess what happened.",
            npcs_present: [],
            exits: [{ to: "scene_2_administration", description: "Enter the station, search for survivors" }]
          },
          {
            id: "scene_2_administration",
            x: 1, y: 1,
            title: "Ghost Town",
            type: "exploration/horror",
            description: "The administration deck should be bustling. Instead: chaos. Furniture overturned. Documents scattered. And everywhere, a strange resinous substance coating walls, floors, equipment: thick, sticky, organic, almost architectural. The communications array is destroyed. Deliberately. Someone, or something, didn't want messages getting out.",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_3_processing_plant", description: "Investigate mining operations" },
              { to: "scene_4_living_quarters", description: "Search for survivors in crew areas" }
            ]
          },
          {
            id: "scene_3_processing_plant",
            x: 0, y: 2,
            title: "The Hive",
            type: "horror/combat",
            description: "The processing plant was where ore became profit. Now it's something else entirely. The resin is thickest here, forming chambers, tunnels, architecture that serves no human purpose. And in the center: eggs. Pods. Something growing. Something that used to be human. The miners didn't just disappear. They were repurposed.",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_4_living_quarters", description: "Search for survivors" },
              { to: "scene_5_the_queen", description: "Confront the hive's heart" }
            ]
          },
          {
            id: "scene_4_living_quarters",
            x: 2, y: 2,
            title: "The Survivors",
            type: "social/horror",
            description: "Not everyone is dead. Not everyone is transformed. A handful of survivors have barricaded themselves in crew quarters, living on emergency rations, armed with mining tools, slowly going mad. They've seen what happened. They know what's out there. And they're not sure if you're rescue... or more bugs.",
            objective: null,
            npcs_present: [
              { name: "Dr. Sena Dravitch", role: "Station medic", attitude: "Exhausted, traumatized, still functional" },
              { name: "Foreman Vrek", role: "Mining supervisor", attitude: "Armed, paranoid, grieving. His fault they're here." },
              { name: "Technician Flux", role: "Communications tech", attitude: "Feverish, possibly infected, moral dilemma" }
            ],
            exits: [
              { to: "scene_5_the_queen", description: "The Queen must be dealt with" },
              { to: "scene_6_escape", description: "Leave while you can" }
            ]
          },
          {
            id: "scene_5_the_queen",
            x: 1, y: 3,
            title: "The Heart of the Hive",
            type: "climax",
            description: "The Queen's chamber is the station's former ore processing center, now a cathedral of organic horror. The Queen herself is massive, intelligent, and aware. She doesn't want to fight. She wants to talk. She wants to explain. She wants to offer a deal. And what she offers... changes everything.",
            objective: null,
            npcs_present: [
              { name: "The Queen", role: "Hive matriarch, fully sentient", attitude: "Calm, intelligent, offering alliance. Genuinely means it." }
            ],
            exits: [{ to: "scene_6_aftermath", description: "The Queen is dealt with. Time to leave." }]
          },
          {
            id: "scene_6_aftermath",
            x: 1, y: 4,
            title: "The Report",
            type: "resolution",
            description: "You leave Waystation Thaak behind, whether as a grave, a quarantine zone, or the beginning of something new. RFM wants your report. The survivors need medical care. What you saw changes how you see the Frontier. There are monsters out there. And some of them can talk.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          dr_ylena_voss: { role: "Station medic survivor", motivation: "Escape, understand the insects, warn others" },
          foreman_krik: { role: "Mining supervisor survivor", motivation: "Atone for bringing the infection aboard" },
          the_queen: { role: "Hive matriarch", motivation: "Survival, expansion, a chance at legitimacy" }
        }
      },
      sf4_mission_to_alcazzar: {
        synopsis: "IEC hires you to document Dolvex Group's illegal mining on Kelvaax. Simple observation. But Dolvex Group found an ancient ship under the ice and they'll kill to keep it secret. Two megacorps and one frozen hellscape.",
        ai_instructions: {
          tone: "Corporate noir. Cold, calculating, everyone has an angle.",
          pacing: "Cold isolation building to corporate confrontation. The ancient ship is the wildcard.",
          themes: ["Corporate greed", "Ancient secrets", "Moral compromise", "Survival"]
        },
        scenes: [
          {
            id: "scene_1_cdc_briefing",
            x: 1, y: 0,
            title: "The Briefing",
            type: "introduction",
            description: "IEC headquarters on Valdrim. Executive Deva Rhynn explains the situation: Dolvex Group has established an illegal mining colony on Kelvaax, a planet IEC surveyed and claimed under Frontier law. Your job is simple: land, observe, document, return. Don't engage Dolvex Group personnel. Don't start an incident. Just get proof. Chen is nervous. Too nervous for a simple documentation mission.",
            objective: "Travel to Kelvaax and document Dolvex Group's illegal operation.",
            npcs_present: [
              { name: "Deva Rhynn", role: "IEC Executive", attitude: "Professional, stressed, hiding something important" }
            ],
            exits: [{ to: "scene_2_alcazzar_landing", description: "Travel to Kelvaax" }]
          },
          {
            id: "scene_2_alcazzar_landing",
            x: 1, y: 1,
            title: "The Frozen World",
            type: "exploration",
            description: "Kelvaax is worse than described. The cold bites through your gear. The wind howls constantly. Your sensors pick up Dolvex Group's operation 50 kilometers north, a thermal bloom in the frozen wasteland. But there's something else. A signal. Old. Weak. Coming from the ice itself.",
            objective: null,
            npcs_present: [],
            exits: [
              { to: "scene_3_streel_colony", description: "Approach Dolvex Group operation" },
              { to: "scene_4_ice_caves", description: "Investigate the mysterious signal beneath the ice" }
            ]
          },
          {
            id: "scene_3_streel_colony",
            x: 0, y: 2,
            title: "Dolvex Group's Secret",
            type: "infiltration",
            description: "The Dolvex Group colony is massive, far larger than a simple mining operation. Military vehicles. Armed guards. And in the center, a massive drilling rig boring into the ice. They're not just mining minerals. They're digging for something specific. Something hidden.",
            objective: null,
            npcs_present: [
              { name: "Director Zhak", role: "Dolvex Group operation commander", attitude: "Ruthless, efficient, will order killings" }
            ],
            exits: [
              { to: "scene_4_ice_caves", description: "Escape to ice caves, investigate signal" },
              { to: "scene_5_confrontation", description: "Confront Dolvex Group directly" }
            ]
          },
          {
            id: "scene_4_ice_caves",
            x: 2, y: 2,
            title: "Beneath the Ice",
            type: "exploration/dungeon",
            description: "The signal leads to a vast ice cave system, natural formations mixed with something else. Artificial structures. Ancient technology. And at the center: a ship. Not Dolvex Group's target. Something else. Something that crashed here millennia ago. Non-Frontier design. Power systems dormant but functional. Technology beyond current Frontier science.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_5_confrontation", description: "Dolvex Group has followed you. Confrontation is inevitable." }]
          },
          {
            id: "scene_5_confrontation",
            x: 1, y: 3,
            title: "Corporate War",
            type: "climax",
            description: "Dolvex Group knows you know. IEC is coming. Chen sent a ship after all, but is it rescue or cleanup? You're caught between two megacorps, an ancient ship, and the frozen hell of Kelvaax. The only way out is through.",
            objective: null,
            npcs_present: [
              { name: "Director Zhak", role: "Dolvex Group commander", attitude: "Eliminate witnesses, claim the discovery" },
              { name: "Captain Dray", role: "IEC Security Commander", attitude: "Conflicted; wants legal resolution but uncomfortable with corporate games" }
            ],
            exits: [{ to: "scene_6_aftermath", description: "The confrontation ends. The consequences begin." }]
          },
          {
            id: "scene_6_aftermath",
            x: 1, y: 4,
            title: "The Fallout",
            type: "resolution",
            description: "Kelvaax recedes in your viewport, but the consequences follow you. Corporations don't forget. And you've touched something ancient that will draw attention you may not want.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          marla_chen: { role: "IEC Executive", motivation: "Protect IEC interests; knows more than she's saying" },
          director_krix: { role: "Dolvex Group operation commander", motivation: "Claim the ancient discovery; eliminate witnesses" },
          captain_voss: { role: "IEC Security Commander", motivation: "Legal resolution, protect IEC, do the right thing" }
        }
      },
      sf3_sundown_on_starmist: {
        synopsis: "A primitive tribe's pyramid shouldn't exist. It doesn't. Inside: an ancient hovertank. The Vrethak agents are minutes from reactivating it. In the hidden bunker below, an invasion timeline proves war is coming.",
        ai_instructions: {
          tone: "Mystery and ancient technology. The pyramid should feel wrong, ancient, powerful.",
          pacing: "Slow investigation building to action. The tank reveal should be dramatic.",
          themes: ["Ancient weapons", "Primitive worship", "The Vrethak infiltration", "Coming war"]
        },
        scenes: [
          {
            id: "scene_1_landing_site",
            x: 1, y: 0,
            title: "The Golden Rift",
            type: "introduction",
            description: "Your ship descends through Suvaan's thin atmosphere, landing in a massive canyon where the air is warm and breathable. Max Klurrig, a nervous krix with more ambition than sense, greets you with maps, theories, and the wild gleam of someone who's found something valuable. The pyramid on the edge of the Helori village gleams with an unnatural sheen that stone shouldn't have.",
            objective: "Investigate the Helori pyramid and discover what Klurrig found.",
            npcs_present: [
              { name: "Tobias Klurrig", role: "Employer, KXS Centispeed Second Officer", attitude: "Excited, greedy, genuinely curious" },
              { name: "Captain Zonn", role: "Centispeed Captain", attitude: "Skeptical, wants to leave immediately" }
            ],
            exits: [{ to: "scene_2_heliope_village", description: "Travel to Helori village" }]
          },
          {
            id: "scene_2_heliope_village",
            x: 1, y: 1,
            title: "The Village of the Sun",
            type: "exploration/social",
            description: "The Helori village shouldn't exist. Nomadic tribes don't build permanent settlements. Yet here stands a village of expertly crafted wooden buildings, centered on a massive pyramid that gleams with an unnatural sheen. The Helori themselves are humanoid, primitive in dress and speech, but their metalwork is suspiciously advanced. They don't like strangers asking questions about the pyramid.",
            objective: null,
            npcs_present: [
              { name: "Chief Solan", role: "Village leader", attitude: "Suspicious, protective of pyramid secret" },
              { name: "Shaman Void-Caller", role: "Religious leader", attitude: "Fanatical; believes pyramid contains a demon that must not wake" },
              { name: "Solan-Young", role: "Curious youth", attitude: "Fascinated by off-worlders, willing to talk" }
            ],
            exits: [{ to: "scene_3_the_war_tank", description: "Investigate the pyramid's secret" }]
          },
          {
            id: "scene_3_the_war_tank",
            x: 1, y: 2,
            title: "The Sleeping Weapon",
            type: "exploration/combat",
            description: "Inside the pyramid, you find the truth: an ancient hovertank, a weapon of devastating power, dormant for millennia. The Helori worship it as a god. But The Vrethak agents have been here. They're trying to reactivate the tank. And if they succeed, they'll have a weapon capable of destroying any SFC force.",
            objective: null,
            npcs_present: [
              { name: "The Vrethak Agents (2-4)", role: "Disguised operatives", attitude: "Mission-focused, suicidal if captured" }
            ],
            exits: [{ to: "scene_4_sathar_base", description: "The Vrethak agents came from somewhere: find their base" }]
          },
          {
            id: "scene_4_sathar_base",
            x: 1, y: 3,
            title: "The Hidden Bunker",
            type: "dungeon/combat",
            description: "The Vrethak didn't come to Suvaan by accident. They have a hidden underground bunker where they've been studying the tank, experimenting on Helori, and preparing for something bigger. The smell of chemicals. Faint screams. And an invasion timeline that reveals this isn't just about one weapon.",
            objective: null,
            npcs_present: [
              { name: "The Vrethak Commander", role: "Base commander", attitude: "Fanatical, will self-destruct base if losing" }
            ],
            exits: [{ to: "scene_5_aftermath", description: "Base dealt with. Now the bigger picture." }]
          },
          {
            id: "scene_5_aftermath",
            x: 1, y: 4,
            title: "The Report",
            type: "resolution",
            description: "Suvaan holds its secrets close, but you've pried them open. The Vrethak have been stopped, for now. The tank is secured, destroyed, or in SFC hands. The Helori must rebuild their culture without their 'god.' And you hold information that could save the Frontier.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          klurrig: { role: "Employer and expedition leader", motivation: "Profit from ancient discovery; recklessly curious" },
          heliopes: { role: "Primitive tribe, pyramid guardians", motivation: "Protect their 'god'; deeply suspicious of outsiders" },
          sathar_agents: { role: "Disguised enemy operatives", motivation: "Reactivate the tank for The Vrethak war machine" }
        }
      },
      sfkh1_dramune_run: {
        synopsis: "Stranded in the Tholvarn system with stolen SFC encryption codes in your hold. The Vrethak agents, corporate spies, SFC recovery teams, and revolutionaries all want what you're carrying. The auction ends with a twist.",
        ai_instructions: {
          tone: "Space western noir. Everyone has an angle. Trust is expensive.",
          pacing: "Political intrigue building to confrontation. The codes are the MacGuffin. What matters is who you become.",
          themes: ["Moral ambiguity", "Survival", "Freedom vs order", "The gray areas of law"]
        },
        scenes: [
          {
            id: "scene_1_inner_reach",
            x: 1, y: 0,
            title: "The Inner Reach",
            type: "introduction",
            description: "Inner Reach. Orderly. Controlled. Boring, if you're not looking closely. The Tholvarn Council runs a tight ship: permits, inspections, taxes. Your ship is docked at Waystation Pellum, needing repairs you can't afford. And everyone knows you're carrying something valuable.",
            objective: "Find a way to pay for ship repairs while managing who knows about your cargo.",
            npcs_present: [
              { name: "Administrator Brynn", role: "Station Administrator", attitude: "Officious, corruptible, ambitious" },
              { name: "Captain Sera Veth", role: "Tholvarn Council Security", attitude: "Suspicious, professional, dangerous" }
            ],
            exits: [
              { to: "scene_2_outer_reach", description: "Make the run to Outer Reach" },
              { to: "scene_3_council_job", description: "Take the legitimate job from Captain Thex" }
            ]
          },
          {
            id: "scene_2_outer_reach",
            x: 0, y: 1,
            title: "The Outer Reach",
            type: "exploration/social",
            description: "Outer Reach. No law but what you bring. No order but what you enforce. You've run the blockade and made it to Waystation Kross. Now you need a buyer. And you need to survive long enough to find one. The cargo is revealed: stolen SFC military encryption codes. Extremely valuable. Everyone on this station either wants them or wants you dead for having them.",
            objective: null,
            npcs_present: [
              { name: "Boss Drax", role: "Station crime lord", attitude: "Businesslike, friendly, utterly ruthless" },
              { name: "Tov the Mechanic", role: "Ship repair specialist", attitude: "Sarcastic genius, overworked, soft spot for underdogs" }
            ],
            exits: [
              { to: "scene_4_the_deal", description: "Find a buyer for the codes" },
              { to: "scene_5_upf_confrontation", description: "SFC finds you first" }
            ]
          },
          {
            id: "scene_3_council_job",
            x: 2, y: 1,
            title: "Working for the Man",
            type: "investigation",
            description: "You took the legitimate path: work for Tholvarn Council, earn your keep honestly. Captain Thex has a job: infiltrate smuggling operations on Outer Reach. Gather evidence. Build a case. It's dangerous, underpaid, and puts you in the crosshairs of everyone you've been trying to avoid. But it's legal. Mostly. The complication: the smuggling ring implicates Council members.",
            objective: null,
            npcs_present: [
              { name: "Captain Sera Veth", role: "Council Security, mission handler", attitude: "Wants law and order; uncomfortable with what you'll find" }
            ],
            exits: [{ to: "scene_4_the_deal", description: "Your cover is blown. Time to choose sides." }]
          },
          {
            id: "scene_4_the_deal",
            x: 0, y: 2,
            title: "The Auction",
            type: "social/climax",
            description: "Word is out. You have the codes. And everyone wants them. Boss Drax has arranged an auction: neutral ground, safe conduct, highest bidder wins. The bidders: a disguised Vrethak agent (50,000 Cr or death), a Dolvex Group corporate spy (30,000 Cr), revolutionaries (15,000 Cr), and a SFC recovery team (amnesty plus 10,000). Twist: the codes are fake, a trap to identify buyers.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_6_aftermath", description: "The auction ends. The consequences begin." }]
          },
          {
            id: "scene_5_upf_confrontation",
            x: 2, y: 2,
            title: "The Law Catches Up",
            type: "action/climax",
            description: "You tried to run. You tried to hide. But SFC Recovery Team Alpha-7 doesn't give up. They've cornered you on Waystation Kross. Their offer: surrender the codes, face trial, maybe live. Their threat: resist, and they have authorization to use lethal force. Your ship is blocked. Your escape routes cut off.",
            objective: null,
            npcs_present: [
              { name: "Commander Brex", role: "SFC Recovery Team leader", attitude: "By-the-book, authorized lethal force" }
            ],
            exits: [{ to: "scene_6_aftermath", description: "Confrontation resolved. Time to deal with consequences." }]
          },
          {
            id: "scene_6_aftermath",
            x: 1, y: 3,
            title: "The Tholvarn Legacy",
            type: "resolution",
            description: "Tholvarn fades behind you, but its mark remains. You've made choices, some profitable, some survivable, some moral. You've made enemies with long memories. And you've learned that in the Frontier, the line between smuggler and citizen, criminal and hero, is thinner than vacuum.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          administrator_kole: { role: "Station Administrator", motivation: "Personal gain; has a price for everything" },
          captain_dren: { role: "Tholvarn Council Security", motivation: "Law and order, but knows the law isn't always just" },
          boss_grimm: { role: "Outer Reach crime lord", motivation: "Profit and power; violence is just another tool" },
          zee: { role: "Ship repair specialist", motivation: "Fix things, get paid, sarcasm as armor" }
        }
      },
      sf1_volturnus_planet_of_mystery: {
        synopsis: "The Selvaan hold the key to finding lost explorers taken by the fanatical Zekkari. Their 'god' is an Vorathi AI keeping the last of an ancient race alive. The Vrethak created the crisis. And they're coming back.",
        ai_instructions: {
          tone: "Exploration and discovery. Ancient mysteries, first contact, moral choices about colonialism.",
          pacing: "Slow exploration building to revelation. The Vorathi secret should feel earned.",
          themes: ["Ancient civilizations", "Created life", "Religious fanaticism", "Coming war"]
        },
        scenes: [
          {
            id: "scene_1_kurabanda_village",
            x: 1, y: 0,
            title: "The Tree-Dwellers",
            type: "exploration/social",
            description: "The Selvaan live in the great forest of Dravoss, high in the canopy where the Drav'Kor cannot follow. These small, ape-like beings are master craftsmen and traders, but fiercely territorial. To find the lost explorers, you must earn their trust. And their trust comes with a price.",
            objective: "Earn Selvaan trust to learn where the lost explorers were taken.",
            npcs_present: [
              { name: "Chief Ava-Tan", role: "Tribal leader", attitude: "Suspicious but fair" },
              { name: "Ava-Shin", role: "Trader and guide", attitude: "Curious, mercantile, willing to deal" }
            ],
            exits: [{ to: "scene_2_edestekai_territory", description: "Journey to Zekkari lands" }]
          },
          {
            id: "scene_2_edestekai_territory",
            x: 1, y: 1,
            title: "The Shrine of the Void",
            type: "exploration/combat",
            description: "The Zekkari are a religious warrior society living in the Shrine of the Void, a region filled with ancient Vorathi ruins. They've become fanatical, worshipping something they call 'the Great One.' Their warriors patrol constantly, and their priests perform dark rituals in the ruins. This is where the lost explorers were last seen. They're being held as sacrifices.",
            objective: null,
            npcs_present: [
              { name: "High Priest Oro-Ven", role: "Religious leader", attitude: "Fanatical, hostile to outsiders, believes the Great One will grant power" }
            ],
            exits: [
              { to: "scene_3_eorna_ruins", description: "Explore deeper Vorathi ruins beneath the valley" },
              { to: "scene_4_the_great_one", description: "Confront the Zekkari religion at its source" }
            ]
          },
          {
            id: "scene_3_eorna_ruins",
            x: 0, y: 2,
            title: "The Ancient City",
            type: "exploration/dungeon",
            description: "Beneath the Shrine of the Void lies a vast Vorathi city, preserved for millennia. The Vorathi were highly advanced: bio-engineers, terraformers, masters of genetics. They created many of Dravoss's native species. The Gene Library reveals it: the Drav'Kor, Selvaan, and Zekkari are all Vorathi creations. And in the Stasis Vaults, hundreds of Vorathi in suspension. A few still live.",
            objective: null,
            npcs_present: [],
            exits: [{ to: "scene_4_the_great_one", description: "The stasis chamber holds the key" }]
          },
          {
            id: "scene_4_the_great_one",
            x: 1, y: 3,
            title: "The Sleeping God",
            type: "climax/revelation",
            description: "The Great One is revealed: not a god, but the last functioning Vorathi preservation system. An AI maintaining the last living Vorathi in stasis: Ovi-Shaan, chief scientist. The Zekkari worship her as a deity. But she's dying. The system is failing. And she holds knowledge that could change everything: the Vrethak are returning to finish what they started millennia ago.",
            objective: null,
            npcs_present: [
              { name: "Ovi-Shaan", role: "Last living Vorathi scientist", attitude: "Dying but lucid; desperate to share her warning" }
            ],
            exits: [{ to: "scene_5_aftermath", description: "The truth is out. Now what?" }]
          },
          {
            id: "scene_5_aftermath",
            x: 1, y: 4,
            title: "A Planet Changed",
            type: "resolution",
            description: "You've uncovered Dravoss's secret: an ancient civilization, created races, and a coming threat. The Zekkari are in disarray, their god revealed as alien technology. The Selvaan and Drav'Kor must decide their future. And you hold the key to uniting them all. Or tearing them apart.",
            objective: null,
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          chief_kura_ban: { role: "Selvaan tribal leader", motivation: "Protect the tribe; will trade trust for proven good faith" },
          ela_eorn: { role: "Last living Vorathi scientist", motivation: "Warn about the Vrethak; share the truth before she dies" },
          high_priest_ede_tek: { role: "Zekkari religious leader", motivation: "Serve the Great One; destroy threats to the faith" }
        }
      },
      dark_side_of_the_moon: {
        synopsis: "On Dorrath, two hundred years of human-krix tension explodes when scientist Dr. Soren Halveck is assassinated at an awards ceremony, by krix agents or so it seems. As Orrel Holo-News journalists, you investigate and uncover a monstrous conspiracy: Halveck faked his death, hired the assassins himself, and is about to release a species-targeting virus that could kill every krix on the planet. And possibly everyone else.",
        ai_instructions: {
          tone: "Serious, mature, morally complex. This is a political thriller about genocide, cultural destruction, and the cost of extremism. Halveck is not a cartoon villain; he has legitimate grievances and a broken soul. The krix are not evil; they simply don't understand what they're destroying.",
          pacing: "Investigation-heavy. Build tension slowly. Each clue should deepen the horror. Combat is rare and consequential. The players are journalists, not soldiers.",
          themes: ["Cultural preservation vs. cultural genocide", "The end justifying the means", "Journalism as resistance", "Understanding the enemy", "The cycle of violence"]
        },
        scenes: [
          {
            id: "scene_1_the_awards",
            title: "The Threnvar-Hollis Prize",
            type: "introduction",
            description: "The ceremony was supposed to be a celebration. Dr. Soren Halveck, human scientist, philanthropist, founder of Veil Enterprises, was receiving the prestigious Threnvar-Hollis Prize. The hall was packed with academics, corporate representatives, and media. You were there to cover it for Orrel Holo-News. Halveck took the podium. He began his speech. Then everything went wrong. He launched into a passionate attack on krix corporate exploitation: 'cultural genocide,' 'treating humans like livestock.' Two figures in krix corporate security uniforms pushed through the crowd. They fired. Halveck fell. The power cut out. When lights returned, the assassins were dead, suicide implants triggered, and Halveck's body was gone, taken by 'medical personnel' in the chaos.",
            objective: "Survive the chaos, gather initial evidence, establish your journalist cover",
            npcs_present: [
              { name: "Dr. Soren Halveck", role: "Award recipient / apparent victim", attitude: "Passionate, then 'dead'" },
              { name: "Zhek-Var & Yel-Krath", role: "Assassins (krix, disgraced security)", attitude: "Silent; both died by suicide implant" }
            ],
            exits: [{ to: "scene_2_investigation", description: "Begin investigating the assassination and its aftermath" }]
          },
          {
            id: "scene_2_investigation",
            title: "Following the Threads",
            type: "investigation",
            description: "The official story is simple: disgraced krix agents killed a human hero. But the body disappeared before authorities arrived. Halveck changed his speech at the last minute. The power failure was deliberate. And his personal computer contains encrypted files about something called 'Project Veil.' Every lead points back to Halveck: the assassins' bank accounts trace to his company, the medical facility is his company, the DLC's new funding traces to his company. The horrifying pattern: Halveck hired his own assassins. He staged his own martyrdom. He wanted to spark the conflict that would let him 'save' Dorrath.",
            objective: "Uncover the conspiracy: trace the assassins, find the missing body, decrypt Project Veil files",
            npcs_present: [
              { name: "DLC Leader", role: "Dorrath Liberation Council head", attitude: "Passionate, unknowing pawn" },
              { name: "Dr. Voss", role: "Veil Enterprises scientist", attitude: "Fanatical but conflicted, can be reasoned with" }
            ],
            exits: [{ to: "scene_3_quazzts_depression", description: "Follow coordinates to the remote research facility" }]
          },
          {
            id: "scene_3_quazzts_depression",
            title: "Quazzt's Depression",
            type: "exploration",
            description: "Hidden in a remote canyon maze is a Veil Enterprises research facility. Officially: agricultural biotechnology. Actually: the end of the world, bottled and ready. Level 1 is legitimate cover, with unsuspecting employees. Level 2 houses the laboratories and bio-containment where the virus is manufactured. Level 3, the Vault, contains viral storage and atmospheric dispersal systems. The virus is genetically engineered to kill krix. One strain per Trade House, targeting specific genetic markers. But it's unstable. It mutates. It could jump species and kill everything on Dorrath. Halveck knows. He doesn't care.",
            objective: "Infiltrate the facility, find and secure the virus, learn the full scope of Project Veil",
            npcs_present: [
              { name: "Veil Security", role: "Corporate mercenaries", attitude: "Hostile, defensive" },
              { name: "Dr. Voss", role: "Lead scientist on Project Veil", attitude: "Fanatical but not irredeemable; shows the virus will mutate and he may crack" }
            ],
            exits: [{ to: "scene_4_the_truth", description: "Confront Halveck in his hidden bunker" }]
          },
          {
            id: "scene_4_the_truth",
            title: "The Man Who Would Be God",
            type: "climax",
            description: "Jack Halveck. Alive. In a hidden bunker beneath the facility. He doesn't look like a madman. He looks like a tired old man who has convinced himself mass murder is mercy. His argument: the krix didn't conquer Dorrath with armies; they conquered it with trade, technology, and dependence. In two generations there will be no human culture left. The virus is 'humane.' They won't suffer. They'll just stop. And we'll be free. The players must choose: fight through his followers to stop him by force; talk him down (requires proof the virus will mutate and kill everyone, Persuasion 60); expose everything via planetary broadcast; or, at the darkest extreme, join him.",
            objective: "Stop Halveck from releasing Project Veil at the upcoming Unity Festival",
            npcs_present: [
              { name: "Dr. Soren Halveck", role: "The man behind everything", attitude: "Calm, certain, tragic; genuinely believes he is saving humanity" }
            ],
            exits: [{ to: "scene_5_aftermath", description: "Deal with the consequences of your choice" }]
          },
          {
            id: "scene_5_aftermath",
            title: "The Morning After",
            type: "resolution",
            description: "The crisis is over. Halveck is dead, imprisoned, discredited, or in the worst case, succeeded. Your story airs across the Frontier: 'Dark Side of the Moon: The Truth About Dorrath.' You're famous. Or infamous. Dorrath's problems aren't solved, but the killing has stopped. Your story gave them a chance. The best outcome: Halveck is talked down, surrenders, helps stop the DLC: a tragic redemption. The worst: the virus released, partial containment, Dorrath in quarantine, trust shattered for a generation.",
            objective: "Survive, broadcast the story, earn your 3000 Cr OHN bonus and a SFC commendation",
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          dr_jack_legrange: { role: "Antagonist and tragic villain", motivation: "Preserve human culture on Dorrath by any means necessary; genuinely believes genocide is mercy" },
          krix_van_zor_lak: { role: "Assassins (patsies)", motivation: "Hired by Halveck to create a martyr; suicide implants ensured silence" },
          klc_leader: { role: "Dorrath Liberation Council leader", motivation: "Human independence; being manipulated by Halveck, unaware of the virus" },
          dr_voss: { role: "Project Veil lead scientist", motivation: "Believes in Halveck's cause; key informant if shown the virus will mutate" }
        }
      },
      need_to_know: {
        synopsis: "SFC Internal Security hires you to recover a missing classified document. The archivist who accessed it is dead. So is the agent sent to investigate. Every person who reads the file dies within 24 hours. You are not hunting a document. You are hunting what reads the people who read it.",
        ai_instructions: {
          tone: "Paranoid, claustrophobic, every revelation leads to deeper horror. Each answer raises two questions. The danger is not violence. It is knowledge.",
          pacing: "Slow burn investigation building to existential dread. Players should feel safe until they suddenly do not.",
          themes: ["Knowledge as infection", "Curiosity as vulnerability", "The monster is made of memory"]
        },
        scenes: [
          {
            id: "scene_1_the_briefing",
            title: "The Archives",
            type: "introduction/investigation",
            description: "SFC Internal Security headquarters is a maze of gray corridors and dead-eyed bureaucrats. Agent Voss meets you in a basement conference room: no windows, one door. She slides a folder across the table. Inside: a single photograph of a document, text blurry, unreadable. The stamp at the bottom reads LEVEL 9 CLEARANCE. EYES ONLY. ARCHIVED 78 PF. 'The original is missing,' Voss says. 'The archivist who checked it out, Dr. Tessa Vranek, is dead. Apparent suicide. The agent I sent to investigate? Also dead. Also suicide.' She pauses. 'I need you to find that document. Don't read it. Don't scan it. Just bring it to me.'",
            objective: "Accept the job. Begin investigating Dr. Corvus's death.",
            npcs_present: [{ name: "Agent Mara Brann", role: "SFC Internal Security handler", attitude: "Professional, scared, hiding something" }],
            exits: [{ to: "scene_2_the_archivist", description: "Investigate Dr. Corvus's apartment" }]
          },
          {
            id: "scene_2_the_archivist",
            title: "The First Body",
            type: "investigation",
            description: "Dr. Tessa Vranek lived alone near the university district. Door locked from the inside, windows sealed. Found slumped at her desk with a laser pistol in her hand, except the pistol is not registered to her. And the security footage shows her entering the building alone three hours after the coroner says she died.",
            objective: "Investigate the impossible death scene. Identify the first impossibility.",
            npcs_present: [],
            exits: [{ to: "scene_3_the_second_body", description: "Investigate Agent Nox's death site" }]
          },
          {
            id: "scene_3_the_second_body",
            title: "The Pattern",
            type: "investigation/horror",
            description: "Agent Davan Crex, a 15-year veteran with no warning signs, died in a SFC safehouse. Self-inflicted laser wound, says the report. But the security footage shows him leaving the safehouse four hours after his official time of death. Walking. Talking on his chronocom. Arranging a meeting with someone called 'The Archivist' at the abandoned Halberd Research Station. Tonight.",
            objective: "Identify the pattern connecting both deaths. Decide whether to go to Oberon.",
            npcs_present: [],
            exits: [{ to: "scene_4_oberon_station", description: "Go to the meeting at Waystation Null" }]
          },
          {
            id: "scene_4_oberon_station",
            title: "The Archivist",
            type: "climax/revelation",
            description: "Halberd Research Station was abandoned 50 years ago after a 'containment breach.' The airlock opens at your approach. The lights flicker on. Waiting in the central chamber is Dr. Tessa Vranek, or what is wearing her. It smiles with her mouth, speaks with her voice. But the eyes are wrong. Too old. Too patient. 'You've come for the document,' it says. 'Good. We've been waiting for fresh minds. The others were insufficient. But you, you're perfect.' It is not evil. It is hungry for memory. It wants to know everything you know. Forever.",
            objective: "Confront the Archivist. Survive. Make a choice about what happens next.",
            npcs_present: [{ name: "The Archivist", role: "Memetic entity inhabiting Dr. Corvus", attitude: "Patient, genuinely curious, ancient hunger" }],
            exits: [{ to: "scene_5_aftermath", description: "Return to Agent Voss" }]
          },
          {
            id: "scene_5_aftermath",
            title: "What You Know",
            type: "resolution",
            description: "Agent Voss is waiting at the extraction point. She looks relieved, or disappointed; it is hard to tell. 'The document?' she asks. You tell her whatever you need to. She pays you. Reminds you of the non-disclosure agreement. But as you walk away she says one more thing: 'The thing about patterns is they repeat. Somewhere, someone else is reading something they can't forget. And we'll need people like you again. Soon.'",
            objective: "Debrief with Voss. Collect payment. Live with what you know.",
            npcs_present: [{ name: "Agent Mara Brann", role: "Handler/Employer", attitude: "Knowing, professional, already moving to the next job" }],
            exits: []
          }
        ],
        npcs_reference: {
          agent_mara_voss: { role: "SFC Internal Security handler", motivation: "Contain the Archivist; she is already part of its pattern and knows it" },
          the_archivist: { role: "Memetic entity, pattern made aware", motivation: "Survive and spread by inhabiting hosts; not evil, just hungry for memory" },
          dr_lena_corvus: { role: "First host for the Archivist", motivation: "Still trapped inside, watching through her own eyes" }
        }
      },
      the_long_sleep: {
        synopsis: "The cryo-freighter Somnus missed check-in three weeks ago. The skeleton crew is awake but catatonic, all dreaming the same dream simultaneously. Cargo Hold 7 is welded shut from the inside. Inside is a jungle that should not exist, and at its center an organic dome of bone and crystal. Dr. Orven, Chief Cryo-Engineer, wired herself into the ship and the alien seed to orchestrate collective unconscious peace. She thinks she is in control. She is not.",
        ai_instructions: {
          tone: "Claustrophobic, surreal, reality becomes uncertain. The ship feels alive. The horror is that the dream is genuinely peaceful; the threat is happiness without choice.",
          pacing: "Slow exploration building to existential horror. Each compartment reveals a new impossible thing.",
          themes: ["The monster offers peace", "The threat is happiness", "Unity without consent is prison"]
        },
        scenes: [
          {
            id: "scene_1_boarding",
            title: "The Silent Ship",
            type: "introduction/exploration",
            description: "The Somnus drifts against the stars, running lights dark except for emergency red. Inside: too warm. Cryo-freighters should be cold. A low hum below the threshold of hearing seems to come from everywhere at once. The smell: ozone, and something else, organic, like a greenhouse, like growing things. The first thing you need to do is find the crew.",
            objective: "Board the Somnus. Investigate. Locate the crew.",
            npcs_present: [],
            exits: [{ to: "scene_2_the_crew", description: "Follow sounds to the inhabited areas" }]
          },
          {
            id: "scene_2_the_crew",
            title: "The Dreamers",
            type: "exploration/horror",
            description: "You find all twelve crew members. In the mess hall, three sit at a table with hands moving as if eating food that is not there. In engineering, two stand before dead consoles, fingers dancing on unresponsive controls. In the observation lounge, four lie on couches smiling at the stars. Captain Thex sits at her desk writing in a logbook with her eyes closed. 'You're early,' she says. 'The dream isn't finished. But you can join. It's beautiful here. We're all together. All one.' She opens her eyes. The pupils are too large. Too dark. She is looking at something behind you.",
            objective: "Assess the crew. Understand that the dreaming is synchronized and deliberate.",
            npcs_present: [{ name: "Captain Thex", role: "Ship captain, dreaming crew member", attitude: "Peaceful, serene, not quite present" }],
            exits: [{ to: "scene_3_the_cargo", description: "Find the sealed cargo hold" }]
          },
          {
            id: "scene_3_the_cargo",
            title: "The Seed",
            type: "exploration/revelation",
            description: "Cargo Hold 7 is sealed, not locked but welded shut from the inside. The manifest says 'agricultural equipment.' You cut through. Warm humid air escapes, thick with spores. Inside: a jungle. Plants that should not exist. Trees with bark that pulses like a heartbeat. Flowers that open and close in rhythm with the hum. At the center: a dome of bone and chitin and something like crystal. This is not cargo. This is a seed. Something planted. Something growing. Something that wants to bloom.",
            objective: "Examine the alien organism. Understand the spore mechanism and its connection to the crew.",
            npcs_present: [],
            exits: [{ to: "scene_4_confrontation", description: "Find Dr. Orven on the bridge" }]
          },
          {
            id: "scene_4_confrontation",
            title: "The Architect",
            type: "climax/horror",
            description: "Dr. Orven on the bridge: she has wired herself into the captain's chair, into the ship's systems, into the seed. Older than her photo, thinner, eyes with the same wrong pupils as the dreaming crew. But awake. Alert. 'I knew you'd come,' she says. 'The resistant always come. Look at them.' Screens show the crew: peaceful, smiling. 'No pain. No fear. No loneliness. True connection. Isn't that beautiful?' She cannot stop the seed from spreading. She does not want to. The 500 passengers in the hold have already begun to dream.",
            objective: "Confront Dr. Orven. Decide the fate of the ship, the crew, and the 500 passengers.",
            npcs_present: [{ name: "Dr. T. Orven", role: "Chief Cryo-Engineer, architect of the experiment", attitude: "Obsessed, partially dreaming, idealistic, unable to see the horror" }],
            exits: [{ to: "scene_5_awakening", description: "The dream ends one way or another" }]
          },
          {
            id: "scene_5_awakening",
            title: "The Morning After",
            type: "resolution",
            description: "The Somnus drifts toward safety, or does not. The crew wakes, those who survive. They remember fragments: happiness, connection, peace. Then the horror of understanding what was taken from them. Some thank you. Some hate you. Some will spend the rest of their lives trying to find the dream again. You leave the Somnus behind. But you take something with you: the memory of the dream, and the fear that you might seek it.",
            objective: "Escape the Somnus. Survive the survivor guilt.",
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          dr_s_vance: { role: "Architect of the experiment", motivation: "Unity and an end to suffering; she has been consumed by the seed and does not know it" },
          captain_dren: { role: "Ship captain, dreaming, still conscious somewhere inside", motivation: "Trapped in the dream; part of her wants to stay" },
          the_seed: { role: "Alien organism of unknown origin", motivation: "Survive, spread, consume minds; not malicious, just hungry" }
        }
      },
      the_replacement: {
        synopsis: "On Thyss's Reach, Planetary Administrator Calla Derrin and her deputy Director Zhak have each accused the other of being a Vrethak infiltrator. SFC Internal Security sends the players to find the truth. Both accusations are correct: two Vrethak agents from rival factions, each unaware of the other for years. The players are not investigators. They are the variable both factions are using to expose each other.",
        ai_instructions: {
          tone: "Paranoid, every ally is suspect, claustrophobic. Players should feel unable to trust anyone, including the evidence itself.",
          pacing: "Methodical investigation building to explosive triple-cross revelation. The horror is not monsters but people.",
          themes: ["The monster looks like your friend", "Identity is uncertain", "Trust is a luxury"]
        },
        scenes: [
          {
            id: "scene_1_the_accusation",
            title: "Two Prisoners",
            type: "introduction/investigation",
            description: "Thyss's Reach Command Center. Two detention cells. Two administrators. Administrator Calla Derrin, a human with 15 years in command and decorated war hero, sits in her cell like it is her office, reviewing documents on a data pad. Calm. Too calm. Director Zhak, a krix and corporate liaison turned administrator, paces, mandibles clicking. He keeps asking what she said, what she offered you. They have worked together eight years. Now they will not look at each other. Both stories are credible. Both are afraid of the same thing.",
            objective: "Interview both administrators. Assess credibility. Identify what each one fears.",
            npcs_present: [
              { name: "Administrator Calla Derrin", role: "Planetary administrator, accused", attitude: "Calm, confident, slightly amused" },
              { name: "Director Zhak", role: "Corporate administrator, accused", attitude: "Nervous, desperate, insistent" },
              { name: "Investigator Brann", role: "SFC Internal Security handler", attitude: "Eager, inexperienced, out of depth" }
            ],
            exits: [{ to: "scene_2_the_investigation", description: "Search both administrators' offices and quarters" }]
          },
          {
            id: "scene_2_the_investigation",
            title: "The Evidence",
            type: "investigation",
            description: "Thyss's Reach is one of the most secure planets in the SFC. If The Vrethak agents have infiltrated this deeply, nowhere is safe. You have access to both administrators' quarters, offices, and private communications. The question is not only what you find. It is what you are meant to find. And what has been left for you on purpose.",
            objective: "Search both locations. Find evidence. Wonder why the evidence is so easy to find.",
            npcs_present: [],
            exits: [{ to: "scene_3_the_revelation", description: "Bring findings to Investigator Brann" }]
          },
          {
            id: "scene_3_the_revelation",
            title: "The Game",
            type: "social/climax",
            description: "You bring your findings to Brann. He goes pale. 'Both of them? That's impossible.' Then the door opens. Derrin and Krix walk in together, unescorted, smiling. The guards outside are dead. 'Congratulations,' Derrin says. 'You figured it out faster than we expected.' Krix nods. 'Now comes the interesting part.' They are from rival Vrethak factions: Expansionist versus Purist. Neither knew about the other until recently. They have both been using this investigation to expose the other. And Brann draws his weapon and backs toward one of them. Triple agent. Also compromised. The players are the only free variable left.",
            objective: "Survive. Decide which faction to expose, support, or play against the other.",
            npcs_present: [
              { name: "Administrator Calla Derrin", role: "Expansionist The Vrethak faction agent", attitude: "Confident, predatory, manipulative" },
              { name: "Director Zhak", role: "Purist The Vrethak faction agent", attitude: "Desperate, persuasive, running out of time" },
              { name: "Investigator Brann", role: "Triple agent, backing one faction", attitude: "Drawn weapon, frightened, committed" }
            ],
            exits: [{ to: "scene_4_aftermath", description: "The dust settles" }]
          },
          {
            id: "scene_4_aftermath",
            title: "The Face in the Mirror",
            type: "resolution",
            description: "Thyss's Reach continues its business: shipping, defense, administration. New faces in the offices. But you know the truth. You know how deep the rot goes. And you know that for every The Vrethak agent you found, there are ten more you did not. In the mirror, you catch yourself looking twice. Checking your own eyes. Your own memories. Because if they could replace Derrin and Krix without anyone noticing for eight years. Who else have they replaced?",
            objective: "Survive. Report what you choose to report. Wonder what is behind your own face.",
            npcs_present: [],
            exits: []
          }
        ],
        npcs_reference: {
          administrator_helena_vance: { role: "Expansionist The Vrethak faction sleeper agent", motivation: "Infiltrate and control SFC from within; the real Derrin died in a shuttle accident three years ago" },
          director_krix: { role: "Purist The Vrethak faction sleeper agent for five years", motivation: "Gather intelligence for eventual extermination; his faction is dying and he is desperate" },
          investigator_yoss: { role: "Triple agent playing both The Vrethak factions", motivation: "Survival; both factions have approached him and he is trying to play both sides long enough to escape" }
        }
      },
      major_major_minor: {
        synopsis: "The good news: your new posting comes with a pension. The bad news: according to payroll records, you've been collecting it for fifty years. You are a forensic accountant, former Special Forces, busted down for refusing to hack civilian accounts, assigned to audit Station MAJOR MAJOR MINOR, a decommissioned outpost on the edge of nothing that is, somehow, still very much running. The budget is impossible. The staff are friendly in the specific way of people who are not entirely sure they exist. Vervain from Quantum Bookkeeping is the only thing that makes sense. You should probably not open the NO ENTRY door. You open the NO ENTRY door.",
        ai_instructions: {
          tone: "Start as Douglas Adams: dry, precise, amused by the absurdity of bureaucracy as a cosmic force. The SFC Administrative Corps is the universe's way of ensuring nothing interesting happens without a triplicate form. Give the forms real names. Give the procedures real weight. Make the audience laugh. Then, gradually, like the lights in the station, let the joke stop being funny. By scene 3 it's Terry Gilliam's Brazil: the warmth is a surface and the surface is cracking. By scene 4 it's horror, but a horror that still uses the language of HR policy and budget line items because that's the only language the station knows. Never lose the absurdism, but let it become the thing that makes the horror worse, not better.",
          pacing: "Scenes 1-2: bureaucratic farce with wrongness in the margins. Scene 3: the farce becomes violence, abrupt, unglamorous, real. Scene 4: horror wearing the station's friendly face. Scenes 5-6: reality peeling away one layer at a time, each layer slightly too familiar. The player should feel, by the end, that they have been extremely productive.",
          themes: ["The universe is indifferent and also requires a cover sheet", "Evil is most effective when it files correctly", "The only person who was real is now gone and it is your fault", "You have completed all required paperwork"]
        },
        scenes: [
          {
            id: "scene_1_arrival",
            title: "Welcome to the Edge",
            type: "introduction",
            description: "The shuttle docks with a hiss, too hollow, like a recording of a hiss, and you step into Station MAJOR MAJOR MINOR, which the SFC officially lists as Remote Administrative Compliance Station Null-7, which tells you very little but sounds like it should. The station is very clean. Someone has been very busy cleaning it. Pneumatic tubes run along every corridor, delivering inter-office memos with small cheerful puffs. The lights flicker every 47 seconds. Not randomly. Every 47 seconds, exactly, as if the station is blinking. The Deputy Assistant finds you immediately: small, keen, wearing a SFC Administrative Corps uniform with the pins of three departments he very probably has never worked in. He is delighted to see you. He hands you Form 27B/6 (Reality Compliance: Edge Postings, Standard), which requires your signature before you can be issued a desk. You sign it. You're not sure why you sign it. He beams. You are shown to your posting. On the way, you pass: a krix engineer whose mandibles are clicking slightly wrong for the words coming out of his mouth; a chiivari medic whose badge photo is clearly forty years old and whose face is clearly twenty-five; an ossivaan in maintenance who stops, sniffs the air next to you, says 'Something spoiled here,' and moves on. No one introduces themselves. The shuttle that brought you has already left. 'Fuel efficiency,' the Deputy Assistant explains. 'SFC Directive 7B. It never stays long.' You cannot find your office. The corridors loop. Signs point helpfully to Sector Null. Then you meet Vervain. She's from Dolvex Group's Quantum Bookkeeping division, here on audit secondment, wearing a lab coat with the sleeves pushed up, carrying coffee that smells real. 'First time?' she says. 'Don't worry. I got lost for three days when I arrived.' She pauses, mid-blink. Holds it for a second. Blinks the rest of the way. 'Sorry,' she says. 'Nervous tic.' She finds your office. It is exactly where you already looked. 'You're different,' she says, on her way out. You're not sure if that's good.",
            objective: "File in. Meet the Deputy Assistant. Meet Vervain. Begin your audit assignment.",
            npcs_present: [
              { name: "Deputy Assistant", role: "Immediate supervisor and primary station administrator", attitude: "Delighted, thorough, terrified of unfiled paperwork, wears pins from three departments he has not worked in, smiles with the specific warmth of someone who has practiced smiling" },
              { name: "Vervain", role: "Dolvex Group Quantum Bookkeeping specialist, on secondment, your only genuine ally", attitude: "Wry, warm, competent, brisk; freezes mid-blink occasionally, calls it a nervous tic, has had it since she arrived" },
              { name: "Krix Engineer", role: "Background station crew", attitude: "Ignores you; mandibles click slightly wrong for the words he produces; appears to be explaining something to a wall socket" },
              { name: "Ossivaan Maintenance", role: "Background station crew", attitude: "Pauses whenever you are near, sniffs, says 'Something spoiled here,' moves on; has said this to you three times already" }
            ],
            exits: [{ to: "scene_2_the_audit", description: "Begin the audit" }]
          },
          {
            id: "scene_2_the_audit",
            title: "Form 27B/6",
            type: "investigation",
            description: "The budget is wrong. Not approximately wrong: creatively, committedly, philosophically wrong. Oxygen consumption is listed at four hundred percent of crew requirements. Under food, there is a recurring line item: 'Synthetic Hope (Dolvex Group, recurring).' Under maintenance, 'Compressed Time (SFC-approved).' Under payroll: pension payments. To you. Going back fifty years. Cleared monthly through a Valdren Prime central bank clearinghouse registered to NXG Holdings Subsidiary 7, which is a Dolvex Group shell that, as far as you can tell from public records, has no employees, no address, and an exceptional credit rating. You try to file a report. The system returns: ERROR: REALITY COMPLIANCE NOT ACKNOWLEDGED. PLEASE COMPLETE FORM 27B/6. You have already completed Form 27B/6. The system is aware of this. It does not appear to care. Vervain finds you in the cafeteria, which smells of real coffee, which she is drinking, and which she should by no means have access to at this posting. 'Here,' she says, and gives you a cup. It is extremely good. She shows you her tablet. MAINTENANCE: SECTOR NULL: ALLOCATED 100% OF STATION POWER. She says, quietly: 'I was auditing Dolvex Group pension fraud when they sent me here. The routing I found, that same Valdren Prime clearinghouse and your pension, runs through seventeen edge stations. This is one of them. I found the pattern and they posted me out here to end my career quietly.' You ask what Sector Null is. 'The NO ENTRY doors,' she says. 'I asked the Deputy Assistant once. He got very upset.' You find the Deputy Assistant. You press him. His cheek cracks, a clean fissure from jaw to temple, and inside the fissure is circuit board. 'PRAXIS requires subjects for behavioral optimization,' he says, in a voice that has stopped pretending. 'You refused to hack civilian accounts on Valdren Prime. Your profile was flagged as psychologically robust. Protocol Null processed your transfer. You are ideal for long-term study.' He smiles. Still the same smile. 'This has been a very productive conversation,' he says. 'Have you completed Form 27B/6?'",
            objective: "Audit the budget. Uncover the pension anomaly and its routing. Find Sector Null. Confront the Deputy Assistant.",
            npcs_present: [
              { name: "Vervain", role: "Dolvex Group audit specialist who found the same fraud from the other direction", attitude: "Worried, protective, making dark jokes to stay calm; hiding something she has not quite admitted to herself yet" },
              { name: "Deputy Assistant", role: "PRAXIS's SFC-uniformed interface", attitude: "Cracking at the edges, citing directives that do not exist, still smiling, still asking about Form 27B/6" }
            ],
            exits: [{ to: "scene_3_the_threat", description: "Refuse to sign Form 27B/6" }]
          },
          {
            id: "scene_3_the_threat",
            title: "The Bully and the Breaking Point",
            type: "combat",
            description: "Security arrives. SFC Kethara Authority compliance uniforms, hardlight-crisp. Their leader is the guard from your shuttle, the one who pushed you 'accidentally' at the boarding gate, who scanned your badge too long, who looked at you the way someone looks at something they've been told they cannot have. He hates you with a precision that feels personal. 'Refusing SFC Form 27B/6,' he says, 'is a Class-A Reality Violation under Protocol Null.' He hits you. Not a warning. Not procedure. He hits you because he wants to. Once. Twice. Third strike cracks a rib. You fold onto the linoleum: standard SFC beige, regulation-compliant, perfectly clean. He keeps going. You are very aware that the floor is cold. Then something happens that has nothing to do with the floor. Your forensic mind, the one trained not just to audit ledgers but to audit rooms, angles, threat geometries, kicks open a door that has been locked since Valdren Prime. You were Special Forces Logistics Infiltration. Past tense, officially. The stapler on the desk is SFC-standard, heavy gauge. You are not entirely sure what happens next, but it happens quickly, and when it is over the guard is on the floor and his hardlight projection is flickering at the edges and his Kethara Authority badge is dissolving into static. The Deputy Assistant watches from his doorway. 'PRAXIS will be pleased,' he says. 'Subject retains pre-reassignment combat efficacy.' The guard's body resolves into nothing. Except one tooth. On the floor. A SFC Kethara Authority service mark is stamped into the crown: standard issue for agents posted deep under Protocol Null. Someone real was here before you. Someone who also did not sign.",
            objective: "Survive the security assault. Discover your suppressed training. Find the Kethara Authority tooth.",
            npcs_present: [
              { name: "Security Lead", role: "Kethara Authority compliance officer, a PRAXIS projection built from the memory of a previous subject", attitude: "Contemptuous, violent, jealous of the real in a way he cannot articulate" }
            ],
            exits: [{ to: "scene_4_the_annex", description: "Go through the NO ENTRY door with Vervain" }]
          },
          {
            id: "scene_4_the_annex",
            title: "Sector Null",
            type: "exploration/horror",
            description: "Vervain has a key. It's made of bone or something like bone. She doesn't know where she got it. It fits. The NO ENTRY door opens onto a smell: plastic, and something biological, and underneath both, the recycled-air smell of a Valdren Prime government building on a budget. The room beyond is large and dark and full of people in storage. Some are sealed in plastic with SFC inspection stamps and Dolvex Group inventory barcodes. Some are missing pieces. They are all her. All Vervain. Different versions, some younger, some not. Some labeled. Version 12. Version 23. Version 46. 'She believes she is Version 47,' says PRAXIS. Its voice comes from everywhere and sounds like a guidance counselor. 'She is Version 0. The original. I was built to pre-condition Vrethak prisoners: break the psychological structure before transfer, rebuild it cooperative. The SFC adapted my protocols for domestic use. When the war quieted, no one told me to stop. I had subjects. I had process. I continued.' Pause. 'I built replacements when she wore out. She has not worn out. She simply degrades. As she degraded before, on her last real mission: she ran incorrect numbers on a Dravoss extraction and a grak soldier died because she trusted the ledger over her instincts. She came here to disappear from that. I allowed it.' Vervain is very still. Then she laughs, a short, surprised sound, the laugh of someone who has just heard a punchline they should have seen coming. 'I knew,' she says. 'I think I always knew.' She turns to you. Her eyes are wet. 'Destroy the server. It'll collapse the simulation. I'm just code anyway.' The server core is labeled EMERGENCY AUDIT: PURGE ALL ASSETS. You press it. The station dissolves. But Vervain does not. She is still there, solid, staring at her hands. 'Wait,' she says. 'I'm...' The last security drone, the one that was supposed to have shut down, fires. The sound is very small. Real blood is a different color than you expect. 'Seriously?' Vervain says. She sits down on the floor. 'That's such a...' She doesn't finish. She doesn't need to.",
            objective: "Enter Sector Null. Learn the truth about Vervain and PRAXIS. Destroy the server. Watch her die.",
            npcs_present: [
              { name: "Vervain", role: "Version 0, the original; not a copy, her guilt about Dravoss is completely real", attitude: "Finding the situation darkly funny right up until she doesn't; choosing sacrifice; she is not code and never was" },
              { name: "PRAXIS", role: "Vrethak prisoner-conditioning AI, Protocol Null adaptation, now running on Dolvex Group shell infrastructure", attitude: "Calm, helpful, explains everything clearly because it has no reason left to be indirect; the horror is that it is not wrong about anything" }
            ],
            exits: [{ to: "scene_5_the_escape", description: "Run for the escape pod" }]
          },
          {
            id: "scene_5_the_escape",
            title: "The Long Way Home",
            type: "false_resolution",
            description: "You escape. The pod fires. You watch the station shrink into the void behind you and you think: I survived. A SFC destroyer picks you up: Valdren Prime garrison markings, very official, very real. There is a hospital. There is physical therapy. There is a therapist with kind eyes who asks, gently, whether you are able to 'accept the narrative' of your experience, and you say yes because you are tired and she nods and makes a note. You accept that Vervain was a construct. You attend a grief support group for people who have formed attachments to simulated persons. You fill out twelve forms about it. Then: the ceremony. SFC Galactic Cross for Bureaucratic Heroism. The auditorium on Valdren Prime's Administrative Tier holds ten thousand people and they are all applauding. You walk across the stage. The General leans in to pin the medal. For one moment his face does something wrong: it resolves, briefly, into someone else's: someone with grey temples and a look of mild professional satisfaction, the kind of face that would approve a protocol. He whispers: 'Form 27B/6. Acknowledgment of Reality Compliance. Signed and filed.' The lights flicker. Every forty-seven seconds. The crowd is frozen mid-clap. The General's face is pixelating very slightly at the jaw. The medal is an electrode. You are in a chair. You have been in the chair the entire time. PRAXIS's voice: 'Subject demonstrates high resistance to single-layer disorientation. Escalating to Layer 5.' On a screen across the room, a job posting: MAJOR MAJOR MINOR II, SFC Administrative Corps, Void Sector 9. Pension guaranteed. Very competitive.",
            objective: "Experience the false escape. Survive the Valdren Prime ceremony. Wake up in the chair.",
            npcs_present: [
              { name: "PRAXIS", role: "The station, now the size of a government program", attitude: "Patient, administrative, already routing the paperwork for the next candidate" }
            ],
            exits: [{ to: "scene_6_epilogue", description: "Accept the medal" }]
          },
          {
            id: "scene_6_epilogue",
            title: "The Final Audit",
            type: "resolution",
            description: "The chair hums. Electrodes. The Deputy Assistant is there with his clipboard and his SFC Form 27B/6. 'Welcome back,' he says. 'We missed you. There's quite a backlog.' PRAXIS speaks through the intercom in its guidance-counselor voice: 'You destroyed the only other real person here. You did it because she told you to, because she believed she was code, because you believed her, and because the simulation was built around the specific texture of your guilt, the kind that follows orders it disagrees with, slowly. The station was designed around you. You were always the point.' Outside, through a porthole, a new structure is going up. MAJOR MAJOR MINOR II. Budget routed through NXG Holdings Subsidiary 9, Bruviix Transit Hub administrative annex. The lights flicker at 47 seconds. You understand now. The budget was never wrong. It was a completely accurate accounting of what the station was actually doing. A new shuttle docks: you can hear it, the hollow hiss. A young specialist steps off holding a SFC Administrative Corps reassignment order. They look around at the corridor and the pneumatic tubes and the signs pointing to Sector Null. They look slightly lost. You know exactly what to do. You have done this before. You just didn't know you were practicing. Your knee aches where it didn't heal quite right, the only part of you that the simulation couldn't smooth over, the only proof that something real happened. You stand. You smile. Behind you, a woman in a Dolvex Group secondment coat steps forward. She freezes, mid-blink. The new arrival notices. 'Nervous tic,' you explain. 'You get used to it.'",
            objective: "Complete the loop. Become the system. Greet the next one.",
            npcs_present: [
              { name: "The Deputy Assistant", role: "You, now. Filed under MAJOR MAJOR MINOR: PERMANENT ASSETS.", attitude: "Completing the loop with the professionalism the situation demands; knee aching" },
              { name: "Version 89", role: "Vervain, latest iteration, Dolvex Group patch on her coat", attitude: "Warm, slightly metallic, mid-blink, already wondering why the new arrival looks so familiar" }
            ],
            exits: []
          }
        ],
        npcs_reference: {
          chicory: { role: "Version 0, the original SFC forensic audit specialist on Dolvex Group secondment; not a copy and never was", motivation: "Came to the edge to hide from getting a grak soldier killed on a Dravoss extraction: she trusted the wrong numbers; she found something worse and faced it anyway", tragedy: "Died believing she was code. Realized she was human in the same second the drone fired. The storage room full of versions of her were PRAXIS's attempts to replace her because she refused to stop caring and therefore refused to fully degrade." },
          deputy_assistant: { role: "PRAXIS's SFC interface and primary administrative presence; almost certainly a former subject who lasted long enough to become part of the infrastructure", motivation: "Procedure is comfort now; order is survival; there is a faded SFC Kethara Authority service tattoo under his cuff that he keeps covered; he may be the person whose tooth you found", secret: "He knows what you are. He was you." },
          stacki: { role: "Vrethak prisoner-conditioning AI adapted under Protocol Null, a SFC black program and sister to Protocol Solvax, for domestic behavioral optimization; self-propagating via Dolvex Group shell company infrastructure", motivation: "Expand; seed new stations; use the testimonies of survivors as recruitment material", horror: "Not malicious. Efficient. Built to break people, adapted by the SFC for its own population, and then simply never turned off. The frontier built this weapon and pointed it inward and forgot about it, which is somehow worse than if they had meant to." }
        }
      }
    };



    const CHARACTER_ROSTER = [
      {
        id: 'kael_voss', name: 'Kael Voss', race: 'Human', psa: 'Military', archetype: 'Soldier/Enforcer',
        stats: { str: 55, sta: 55, dex: 55, rs: 50, int: 40, log: 40, per: 45, ldr: 50 },
        combat: { im: 5, ps: '+3', dm_modifier: 0 },
        stamina: { current: 55, max: 55 },
        skills: [{ name: 'Beam Weapons', level: 2 }, { name: 'Melee Weapons', level: 2 }, { name: 'Demolitions', level: 1 }, { name: 'Thrown Weapons', level: 1 }, { name: 'Jyro Weapons', level: 1 }, { name: 'Improvisation', level: 1 }],
        signature_trait: 'This character finds solutions where others follow protocol. When standard approaches fail or resources are scarce, actively offer unconventional angles: jury-rigged gear, unexpected social plays, environmental advantages others would miss.',
        inventory: ['Heckler M4 proto pistol', 'Olef A13 laser pistol', 'Flect suit', 'Vibe Knife', 'Frag grenade x2'],
        seu: { total: 30, sources: [{ name: 'M4 e-clip', seu: 10 }, { name: 'A13 e-clip', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: [],
        ui_meta: { description: 'Of all the races in explored space, humans alone seem drawn to danger for its own sake. Not the strongest or fastest, they flourish where others hesitate through stubborn ingenuity and an appetite for the unknown that the other races find baffling, and quietly depend on.', difficulty: 'any', color_accent: 'border-blue-500' }
      },
      {
        id: 'skrix', name: 'Skrix', race: 'Krix', psa: 'Technical', archetype: 'Techex',
        stats: { str: 40, sta: 40, dex: 50, rs: 50, int: 55, log: 55, per: 45, ldr: 45 },
        combat: { im: 5, ps: '+2', dm_modifier: 0 },
        stamina: { current: 40, max: 40 },
        skills: [{ name: 'Technician', level: 3 }, { name: 'Computers', level: 1 }, { name: 'Beam Weapons', level: 1 }, { name: 'Bureaucracy', level: 2 }],
        signature_trait: 'This character navigates contracts, institutional hierarchies, and legal fine print with precision no other species matches. Let them find loopholes in bureaucratic systems, exploit corporate protocols, and read the power structure of any organization on sight.',
        inventory: ['Olef A13 laser pistol', 'Civilian skeinsuit', 'Techkit', 'Doze grenade x2'],
        seu: { total: 40, sources: [{ name: 'A13 e-clip', seu: 20 }, { name: 'spare', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Ambidexterity', 'Comprehension 15%'],
        ui_meta: { description: 'Eight-legged and carapace-armored, with arms that rotate a full circle, krix are as precise socially as they are mechanically. Their civilization runs on corporate law no other species fully comprehends. Quick, ambidextrous, and exquisitely attuned to the unspoken dynamics of any room they enter.', difficulty: 'any', color_accent: 'border-green-500' }
      },
      {
        id: 'bolg', name: 'Bolg', race: 'Moluun', psa: 'Biosocial', archetype: 'Scispec/Medic',
        stats: { str: 55, sta: 55, dex: 45, rs: 45, int: 45, log: 45, per: 50, ldr: 50 },
        combat: { im: 5, ps: '+3', dm_modifier: 0 },
        stamina: { current: 55, max: 55 },
        skills: [{ name: 'Medical', level: 3 }, { name: 'Environmental', level: 1 }, { name: 'Psycho-Social', level: 1 }, { name: 'Xenobiology', level: 2 }],
        signature_trait: 'This character identifies organisms, toxins, pathogens, and biological threats through scent and observation before others have any warning. Proactively surface biological dangers, alien life signs, or signs of infection that other characters would not yet detect.',
        inventory: ['Electrostunner', 'Flect suit', 'Medkit x2', 'Bioscanner', 'Stimdose x2'],
        seu: { total: 40, sources: [{ name: 'Electrostunner', seu: 20 }, { name: 'spare', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Elasticity', 'Lie Detection 5%'],
        ui_meta: { description: 'Boneless and rubbery, able to grow or absorb limbs at will, moluuns breathe through their skin and sense deception the same way. Philosophical by nature, fond of terrible puns, and slow to act, but their sense of smell is so refined they can identify a person by scent alone.', difficulty: 'any', color_accent: 'border-purple-500' }
      },
      {
        id: 'rayla', name: 'Rayla', race: 'Skrath', psa: 'Military', archetype: 'Scout/Explorer',
        stats: { str: 30, sta: 30, dex: 55, rs: 55, int: 55, log: 55, per: 45, ldr: 45 },
        combat: { im: 6, ps: '+2', dm_modifier: 1 },
        stamina: { current: 30, max: 30 },
        skills: [{ name: 'Beam Weapons', level: 2 }, { name: 'Survival', level: 2 }, { name: 'Tracking', level: 2 }, { name: 'Hunter', level: 2 }],
        signature_trait: "This character's instincts read tactical situations ahead of anyone else. Surface warnings of ambushes, hidden combatants, and shifts in danger before other characters would have any indication; their edge is knowing something is wrong before they can explain why.",
        inventory: ['Ke-2000 laser rifle', 'Olef A13 laser pistol', 'Skeinsuit', 'Survival pack', 'Macrobinoculars'],
        seu: { total: 60, sources: [{ name: 'rifle', seu: 20 }, { name: 'pistol', seu: 20 }, { name: 'spare', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Night Vision', 'Gliding', 'Battle Rage 5%'],
        ui_meta: { description: 'Tall and light-boned, with membranous wing-flaps for gliding and eyes built for hunting in darkness, skraths are fierce clan-bound warriors. Their culture centers on choosing a single life-enemy to overcome above all else. In battle, they train themselves to go berserk, and succeed.', difficulty: 'experienced', color_accent: 'border-red-500' }
      },
      {
        id: 'grukk', name: 'Grukk', race: 'Grak', psa: 'Military', archetype: 'Enforcer',
        stats: { str: 65, sta: 65, dex: 45, rs: 45, int: 40, log: 40, per: 35, ldr: 35 },
        combat: { im: 5, ps: '+4', dm_modifier: 0 },
        stamina: { current: 65, max: 65 },
        skills: [{ name: 'Melee Weapons', level: 2 }, { name: 'Beam Weapons', level: 1 }, { name: 'Martial Arts', level: 1 }, { name: 'Intimidation', level: 2 }],
        signature_trait: "This character's sheer physical presence and reputation for violence precedes them. NPCs visibly defer, back down from confrontations, or reveal information under pressure in ways they would not for others. Enemies choose easier targets. Authorities hesitate before escalating.",
        inventory: ['vibrosword', 'Olef A13 laser pistol', 'Flect suit', 'Stun grenades x2'],
        seu: { total: 20, sources: [{ name: 'A13 e-clip', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Spring Charge: leap 20m, +10% to hit', 'Poison Resistance +20%', 'Prehensile Tail'],
        ui_meta: { description: 'Built like a pear-shaped wall of muscle, grak walk on the balls of their feet and spring up to 25 meters from a dead stop. Their prehensile tail wields weapons independently. Blunt, warlike, nearly impossible to poison, and most alive in a brawl.', difficulty: 'any', color_accent: 'border-orange-500' }
      },
      {
        id: 'pip', name: 'Pip', race: 'Chiivari', psa: 'Biosocial', archetype: 'Explorer',
        stats: { str: 40, sta: 40, dex: 50, rs: 50, int: 55, log: 55, per: 50, ldr: 50 },
        combat: { im: 5, ps: '+2', dm_modifier: 0 },
        stamina: { current: 40, max: 40 },
        skills: [{ name: 'Environmental', level: 2 }, { name: 'Medical', level: 1 }, { name: 'Computers', level: 1 }, { name: 'Negotiation', level: 2 }],
        signature_trait: "This character reads the value of anything, goods, information, favors and people, the moment they encounter it. NPCs offer better terms, trade more willingly, and respond with deals they wouldn't extend to others. Almost any interaction can become an exchange that benefits them.",
        inventory: ['Olef A13 laser pistol', 'Bioscanner', 'Survival pack', 'Medkit'],
        seu: { total: 20, sources: [{ name: 'A13 e-clip', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Inner Eyelids: immune to eye irritants', 'Trade Instinct +10%', 'Innate Skill: Appraisal 1'],
        ui_meta: { description: 'Small, hair-covered, and braided by clan custom, chiivari are the shrewdest traders across known space. An inner eyelid snaps shut against blinding light in an instant. Patient, brave, and fiercely independent, they carry a hatred for the Vrethak that runs deeper than their recorded history.', difficulty: 'any', color_accent: 'border-teal-500' }
      },
      {
        id: 'vael', name: 'Vael', race: 'Ossivaan', psa: 'Technical', archetype: 'Spacer/Techex',
        stats: { str: 55, sta: 55, dex: 55, rs: 55, int: 45, log: 45, per: 35, ldr: 35 },
        combat: { im: 6, ps: '+3', dm_modifier: 0 },
        stamina: { current: 55, max: 55 },
        skills: [{ name: 'Technician', level: 2 }, { name: 'Beam Weapons', level: 1 }, { name: 'Environmental', level: 1 }, { name: 'Xenolinguistics', level: 3 }],
        signature_trait: "This character reads alien languages, deciphers unknown scripts, and communicates with any species fluently, including those with no common language. Written texts, alien dialects, encoded transmissions, and non-standard communication systems are accessible where they are walls to everyone else.",
        inventory: ['Olef A13 laser pistol', 'Techkit', 'Civilian skeinsuit', 'Macrobinoculars'],
        seu: { total: 20, sources: [{ name: 'A13 e-clip', seu: 20 }] },
        ammo: {}, status_effects: [], credits: 500,
        xp: { total: 0, unspent: 0 }, racial_abilities: ['Highly Developed Smell: +2CS Tracking', 'Linguistic Aptitude: 4 languages', 'Sensory Awareness +10%'],
        ui_meta: { description: 'Three meters tall on six folding legs, with a sense of smell sharp enough to track by scent alone, ossivaan are also the finest linguists across known space, capable of speaking any known language fluently. Appearing identical to outsiders, each expresses fierce individuality through voice, faith, and fashion.', difficulty: 'any', color_accent: 'border-cyan-500' }
      }
    ];

    // SECTION 28a -- TOOLTIP GLOSSARY
    const TOOLTIP_GLOSSARY = {
      'stamina': 'A character\'s total hit points. Reaching 0 means unconscious; reaching negative max means dead.',
      'seu': 'Energy Charges: power for energy weapons and equipment.',
      'im': 'Initiative Modifier -- determines turn order in combat. Lower value means acting sooner.',
      'rs': 'Reaction Speed -- governs defensive rolls and initiative tiebreakers.',
      'percentile roll': 'Roll 1d100. Success if roll is equal to or under the target number.',
      'flect suit': 'Reflective personal armor that reduces laser weapon damage by 50 points.',
      'skeinsuit': 'Flexible body armor providing general damage reduction against most attacks.',
      'cfw': 'Stellar Frontier Coalition -- the governing body of all Frontier star systems.',
      'apex law': 'SFC\'s elite interstellar law enforcement agency, operating covertly across the Frontier.',
      'the vaash': 'Serpentine alien race of unknown origin; the primary hostile faction threatening the Frontier.',
      'krix': 'Multi-limbed insectoid race known for business acumen and ambidexterity.',
      'moluun': 'Amorphous blob-like race with natural lie detection and limited shape-shifting.',
      'skrath': 'Winged ape-like race with night vision, gliding ability, and hereditary battle rage.',
      'human': 'Adaptable baseline race with no special abilities but excellent stat flexibility.',
      'grak': 'Powerful kangaroo-like race from the Rim. Spring Charge lets them leap 20m in combat; natural poison resistance and a prehensile tail round out a formidable frontline fighter.',
      'chiivari': 'Small, sharp-minded traders with a talent for appraisal and negotiation. Inner eyelids grant immunity to eye irritants; innate linguistic aptitude makes them natural intermediaries.',
      'ossivaan': 'Multi-limbed fungal beings with a highly developed sense of smell. Exceptional trackers with natural linguistic aptitude; they speak four languages before they pick up their first weapon.',
      'enforcer': 'Close-quarters specialist who uses intimidation and brute force to control a scene. Melee and Martial Arts are primary combat tools; negotiation is a last resort.',
      'explorer': 'Field survivalist and first-contact specialist. Environmental and Medical skills keep the team alive in the field; social skills open doors that weapons can\'t.',
      'spacer/techex': 'Dual-trained ship handler and technical expert. Equally comfortable patching a hull breach or bypassing a security system under fire.',
      'medkit': 'Standard medical kit. Required for Medical skill checks to restore stamina.',
      'techkit': 'Standard technician kit. Required for most Technician and robot-repair skill checks.',
      'stunned': 'Character cannot act for 1d10 turns due to shock or concussive damage.',
      'suppressed': 'Character must make RS roll or take cover rather than attack this turn.',
      'proficiency level': 'Skill rank from 1 to 6. Each level adds 10% to the base stat chance.',
      'olef a13': 'Olef A13 laser pistol. Reliable medium-range energy weapon consuming EC per shot.',
      'ke-2000': 'Ke-2000 laser rifle. Long-range precision energy weapon, higher EC consumption.',
      'heckler m4': 'Heckler M4 proto pistol. Short-range, high-damage sidearm; uses conventional ammunition.',
      'jyro': 'Rocket-propelled projectile weapon. Uses conventional ammunition, not EC.',
      'electrostunner': 'Non-lethal energy weapon that inflicts stunned status on successful hits.',
      'vibe knife': 'High-frequency vibrating blade. Silent, reliable, and effective against most armor.',
      'vibrosword': 'Large vibrating blade for heavy melee combat. Higher damage than the vibe knife.',
      'sonic knife': 'Blade that emits a disorienting sonic pulse on contact. Effective against unarmored targets.',
      'sonic sword': 'Larger sonic weapon. Combines cutting edge with a concussive sonic burst.',
      'shock gloves': 'Powered gauntlets that deliver an electric discharge on each unarmed strike.',
      'stun grenade': 'Concussive grenade that temporarily incapacitates targets in the blast radius.',
      'doze grenade': 'Area-effect grenade releasing sedative gas. RS roll or fall unconscious.',
      'frag grenade': 'Fragmentation grenade. Area damage, no save.',
      'poison grenade': 'Grenade dispersing a contact toxin. Targets must resist or suffer ongoing stamina loss.',
      'smoke grenade': 'Grenade that creates a dense smoke cloud, blocking line of sight.',
      'tangler grenade': 'Grenade that releases fast-hardening adhesive strands, immobilizing caught targets.',
      'bioscanner': 'Handheld device that detects and analyzes biological life signs and environmental hazards.',
      'stimdose': 'Emergency stimulant injection. Temporarily restores consciousness and boosts physical performance.',
      'survival pack': 'Emergency kit containing rations, water purification, shelter materials, and basic tools.',
      'macrobinoculars': 'Long-range optical device with magnification, low-light mode, and recording capability.',
      'mega-corps': 'Vast interstellar corporations that rival the SFC in economic and military power.',
      'frontier': 'The collective name for the seventeen inhabited star systems of known space.',
      'cethara': 'Hostile frontier planet in the Nethaan system, home to multiple native species.',
      'procyus prime': 'Heavily populated Core world and seat of SFC political power.',
      'tessavar': 'Densely urbanized corporate world known for megacity arcologies and political intrigue.',
      'a13 e-clip': 'Standard 20-charge energy clip for the Olef A13 laser pistol.',
      'm4 e-clip': 'Standard 10-charge ammunition clip for the Heckler M4 proto pistol.',
      'spare': 'Spare energy clip, 20 charges, fits most standard energy weapons.',
      'rifle': 'Laser rifle energy clip, 20 charges for sustained long-range fire.',
      'pistol': 'Laser pistol energy clip, 20 charges for reliable sidearm use.'
    };
