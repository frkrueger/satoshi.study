// The deck, one entry per slide, in order.
//
//   type     which layout in build.js renders it
//   scene    original slide number; its narration + source fill the presenter notes
//   say      replaces the original narration in the notes (used where a scene is split
//            across slides, so each slide carries only its own part)
//   t        year for the orange dot on the timeline (fractions = months)
//   range    [from, to] highlighted on the timeline (chapter dividers)
//   *text*   highlight colour;  \n  a line break the layout keeps
//
// Headlines and supporting lines are condensed from the original narration, which
// lives in full in the presenter notes. No claim is added beyond the original deck,
// except the explicit hypothesis slide and the Satoshi dates on the commit-gap build.

const DISCLAIMER = [
  "Notes that apply to the whole deck (from the original presenter notes):",
  "The photograph/document is historical where explicitly described as such. Text-only editorial pages are not archival facsimiles. Hypotheses about Satoshi authorship are unproven.",
  "Presentation guidance: Allow the image or document to lead. Pause at the central question before advancing. Avoid presenting circumstantial similarity as authorship proof.",
].join("\n\n");

module.exports = [
  // ============================================================ Opening
  {
    type: "title", section: "Opening",
    kicker: "A historical investigation",
    title: "Who was\nSatoshi*?*",
    sub: "The road to Bitcoin, 1972–2014",
    range: [1972, 2014],
    notes: DISCLAIMER,
  },

  // ============================================================ I
  { type: "chapter", section: "I · The Mathematician", kicker: "Chapter I", title: "The Mathematician", sub: "1972 – 1979", range: [1972, 1979] },
  {
    type: "photo", scene: 1, t: 1972, image: "hal-1972.jpg",
    kicker: "1972 · Age 16", title: "The young mathematician",
    sub: "Drawn to problems with precise answers — answers that could take hours to find.",
  },
  {
    type: "figure", scene: 2, t: 1974,
    kicker: "1974 · Age 18", title: "*Six* miles",
    sub: "From Arcadia High School, valedictorian, to Caltech.",
  },
  {
    type: "photo", scene: 3, t: 1974.7, image: "caltech.jpg",
    kicker: "1974 · Age 18", title: "Caltech",
    sub: "Mathematics, physics, engineering — and, increasingly, computers.",
  },
  {
    type: "photo", scene: 4, t: 1976, image: "feller.jpg",
    kicker: "1970s · Mathematics", title: "A classic text",
    sub: "William Feller’s *probability theory*. Decades later, Satoshi would cite it in the whitepaper.",
  },
  {
    type: "photo", scene: 5, t: 1978, image: "hal-and-fran.jpg",
    kicker: "1978 · Age 22", title: "Hal and Fran",
    sub: "A partnership through remarkable achievements — and extraordinary hardship.",
  },
  {
    type: "photo", scene: 6, t: 1979.5, image: "intellivision.jpg",
    kicker: "1979 · Age 23", title: "The programmer",
    sub: "Mattel’s Intellivision: sophisticated systems in extraordinarily little memory.",
  },

  // ============================================================ II
  { type: "chapter", section: "II · Trust and Privacy", kicker: "Chapter II", title: "Trust and Privacy", sub: "1981 – 1993", range: [1981, 1993] },
  {
    type: "person", scene: 7, t: 1981, image: "chaum.png",
    kicker: "Early 1980s · A parallel story", title: "David Chaum",
    sub: "How can people who distrust one another run a *trustworthy* computer system?",
  },
  {
    type: "photo", scene: 8, t: 1982, image: "chaum-dissertation.jpg",
    kicker: "1982 · UC Berkeley", title: "Mutually suspicious groups",
    sub: "The problem of *trust* — central to digital money, and one day to Bitcoin.",
  },
  {
    type: "photo", scene: 9, t: 1982.6, image: "blind-signatures.jpg",
    kicker: "1982 · Crypto ’82", title: "Blind signatures",
    sub: "Electronic payments with the privacy of *physical cash*.",
  },
  {
    type: "person", scene: 10, t: 1991.4, image: "zimmermann.png",
    kicker: "1991", title: "Phil Zimmermann",
    sub: "PGP: strong encryption for ordinary users. *Hal Finney* contributed as a programmer.",
  },
  {
    type: "photo", scene: 11, t: 1992.6, image: "dwork-naor.jpg",
    kicker: "1992 · Crypto ’92", title: "Computation as a price",
    sub: "Cynthia Dwork and Moni Naor: make the sender of junk email do a little work first.",
    say: "Cynthia Dwork and Moni Naor proposed a strange answer to junk email: make the sender perform a little computation first.",
  },
  {
    type: "statement", scene: 11, t: 1992.6,
    kicker: "1992", title: "Expensive to produce.\nCheap to *verify*.",
    sub: "An ancestor of proof of work.",
    say: "The work would be expensive to produce, but inexpensive to verify. They were describing an ancestor of proof of work.",
  },
  {
    type: "photo", scene: 12, t: 1993.2, image: "wired-1993.jpg",
    kicker: "1993 · Wired", title: "The crypto rebels",
    sub: "The Cypherpunks: privacy *built* with software, not merely promised by law.",
  },

  // ============================================================ III
  { type: "chapter", section: "III · The Small World", kicker: "Chapter III", title: "The Small World", sub: "1996 – 2002", range: [1996, 2002] },
  {
    type: "statement", scene: 13, t: 1996.5,
    kicker: "1996 · Age 40", title: "PGP becomes\na career.",
    sub: "In this world: a younger cryptographer named *Len Sassaman*.",
  },
  {
    type: "person", scene: 14, t: 1997.3, image: "back.png",
    kicker: "1997", title: "Adam Back",
    sub: "Hashcash: proof that a computer has done work. Built to fight *spam*.",
  },
  {
    type: "nonce", scene: 15, t: 1997.3, rows: 1,
    kicker: "Hashcash · 1997", title: "Search for a nonce",
    say: "Try a nonce. Hash the message. Wrong result?",
  },
  {
    type: "nonce", scene: 15, t: 1997.3, rows: 2,
    kicker: "Hashcash · 1997", title: "Search for a nonce",
    say: "Change the nonce and try again.",
  },
  {
    type: "nonce", scene: 15, t: 1997.3, rows: 3,
    kicker: "Hashcash · 1997", title: "Search for a nonce",
    sub: "Millions of attempts to find. *One* to verify.",
    say: "Eventually, one hash meets a difficulty target. Finding it may take millions of attempts. Verifying it takes one. This asymmetry would become central to Bitcoin mining.",
  },
  {
    type: "person", scene: 16, t: 1998.9,
    kicker: "1998", title: "Wei Dai",
    sub: "Creator of Crypto++.\nProposed *b-money*.",
  },
  {
    type: "photo", scene: 17, t: 1998.9, image: "b-money.jpg",
    kicker: "1998", title: "b-money",
    sub: "Pseudonymous users. Signed transfers. Shared records of who owns what.",
    say: "In Wei Dai's b-money, participants would maintain records of ownership and transfer value with digital signatures. The idea was remarkably close to Bitcoin's ambition.",
  },
  {
    type: "statement", scene: 17, t: 1998.9,
    kicker: "b-money", title: "But how would\neveryone *agree*?",
    sub: "Coordination and reliable agreement were left unresolved.",
    say: "But the proposal left practical problems of coordination and reliable agreement unresolved.",
  },
  {
    type: "person", scene: 18, t: 1998.9, image: "szabo.png",
    kicker: "1998", title: "Nick Szabo",
    sub: "Digital property, contracts, scarcity —\nand *Bit Gold*.",
  },
  {
    type: "person", scene: 19, t: 1999.5, image: "sassaman.png",
    kicker: "Late 1990s", title: "Len Sassaman",
    sub: "Privacy and anonymous messaging.\nHe knew *Hal Finney*.",
  },
  {
    type: "network", scene: 20, t: 2000, full: false,
    kicker: "The small world",
    say: "Hal met and corresponded extensively with Wei Dai and Nick Szabo. He exchanged technical ideas with Adam Back. His professional circle included Phil Zimmermann and Len Sassaman.",
  },
  {
    type: "network", scene: 20, t: 2000, full: true,
    kicker: "The small world",
    say: "These were not isolated inventors. They worked in an overlapping world of ideas and personal relationships.",
  },
  {
    type: "statement", scene: 21, t: 2002,
    kicker: "The missing ingredient", title: "Not better encryption.\nNot another digital token.",
    say: "By the early 2000s, the ingredients were scattered among a small community. Digital cash. Proof of work. Cryptographic ownership. Distributed records. But a practical currency without a trusted issuer had still not appeared.",
  },
  {
    type: "statement", scene: 21, t: 2002,
    kicker: "The missing ingredient", title: "A way for strangers\nto agree on *one history*.",
    say: "Who would put the pieces together?",
  },

  // ============================================================ IV
  { type: "chapter", section: "IV · RPOW", kicker: "Chapter IV", title: "RPOW", sub: "Reusable Proofs of Work · 2004 – 2005", range: [2004, 2005.2] },
  {
    type: "figure", scene: 22, t: 2004.6, size: 220,
    kicker: "2004 · Age 48 · He built it", title: "*RPOW*",
    sub: "Working digital-money software — not merely a proposal.",
  },
  {
    type: "statement", scene: 23, t: 2004.62,
    kicker: "August 15, 2004 · Cryptography mailing list", title: "An open\ninvitation.",
    sub: "Hal asked cryptographers to test his Hashcash-based server — and to *criticize* it.",
  },
  {
    type: "quote", scene: 24, t: 2004.63, size: 48,
    kicker: "August 18, 2004 · The critic",
    quote: "“I’m wondering how applicable RPOW is.”\n“…*aren’t we restricted to applications already nailed down by digital cash schemes?*”",
    by: "Ray Dillinger (“bear”), Cryptography mailing list",
  },
  {
    type: "quote", scene: 25, t: 2004.63,
    kicker: "August 19, 2004 · Hal answers",
    quote: "“Another way to think of RPOWs is as an implementation of *Nick Szabo’s concept of ‘bit gold’*.”",
    by: "Hal Finney, Cryptography mailing list",
  },
  {
    type: "statement", scene: 26, t: 2004.64,
    kicker: "August 21, 2004 · Adam Back replies", title: "Two future Bitcoin\npioneers, *debating*.",
    sub: "Back saw RPOW as Chaumian e-cash, built from Hashcash and trusted hardware.",
  },
  {
    type: "statement", scene: 27, t: 2004.7,
    kicker: "The IBM coprocessor", title: "Trust still lived\ninside an *IBM chip*.",
    sub: "Even the operator couldn’t cheat — but everyone depended on trusted hardware.",
  },
  {
    type: "statement", scene: 28, t: 2004.7,
    kicker: "The weakness", title: "If the server failed,\nthe tokens could *fail*.",
    sub: "One machine’s fate should not decide whether someone’s savings survive.",
  },
  {
    type: "statement", scene: 29, t: 2004.7,
    kicker: "World of RPOW", title: "A shared\n*database*?",
    sub: "Several RPOW servers keeping one common record of spent tokens.",
    say: "Hal considered having multiple RPOW servers maintain a shared record of spent tokens. That required keeping their histories consistent while preventing double spending.",
  },
  {
    type: "quote", scene: 29, t: 2004.7, size: 60,
    kicker: "Hal Finney · World of RPOW",
    quote: "“Ultimately, this approach was considered and *rejected*.”",
    by: "Hal Finney, RPOW documentation: clustering and shared databases",
    say: "He judged the proposed design too complex for RPOW and rejected it.",
  },
  {
    type: "statement", scene: 30, t: 2004.8, size: 80,
    kicker: "The unsolved question", title: "How can computers\nthat don’t trust\none another agree on\n*who owns the money*?",
  },
  {
    type: "statement", scene: 31, t: 2005.1,
    kicker: "February 2005 · CodeCon", title: "Peer-to-peer\n*money*.",
    sub: "RPOW meets BitTorrent: share files to earn tokens, spend tokens to buy priority.",
  },
  {
    type: "statement", scene: 32, t: 2005.16,
    kicker: "February 27, 2005 · RPOW 1.2.0", title: "Add *Tor*.",
    sub: "Proof of work, transferable tokens, peer-to-peer apps — and anonymous communication.",
  },
  {
    type: "statement", scene: 33, t: 2005.16,
    kicker: "February 2005", title: "The public RPOW\ntrail ends.",
    sub: "The *problem* does not.",
  },

  // ============================================================ V
  { type: "chapter", section: "V · The Silence", kicker: "Chapter V", title: "The Silence", sub: "2005 – 2008", range: [2005.2, 2008.6] },
  {
    type: "figure", scene: 34, t: 2006,
    kicker: "2005 – 2007", title: "Two *years*.",
    sub: "Who made the leap?",
  },
  {
    type: "statement", scene: 35, t: 2005.95,
    kicker: "December 2005 · Nick Szabo", title: "Bit Gold,\nin print.",
    sub: "Proof of work, timestamping, ownership records — and still no public implementation.",
  },
  {
    type: "statement", scene: 36, t: 2007.3,
    kicker: "2007", title: "Someone begins\nwriting Bitcoin.",
    sub: "We do not know *who*.",
  },
  {
    type: "figure", scene: 37, t: 2007.85,
    kicker: "November 2007", title: "RFC *4880*",
    sub: "Hal co-authors the OpenPGP standard — still a working cryptographic engineer.",
  },
  {
    type: "quote", scene: 38, t: 2008.3, size: 64,
    kicker: "April 2008 · Nick Szabo, on Bit Gold",
    quote: "“Anybody want to help me *code one up*?”",
    by: "Nick Szabo, blog comment",
    say: "In a Bit Gold discussion, Nick Szabo invited someone to help code an experimental implementation.",
  },
  {
    type: "statement", scene: 38, t: 2008.3,
    kicker: "April 2008", title: "Hal had already\nbuilt *RPOW*.",
    sub: "There is no verified evidence he answered.",
    say: "He knew Hal Finney, who had already built RPOW. There is no verified evidence Hal answered that invitation.",
  },
  {
    type: "gap", scene: 39, t: 2008.1, step: 1,
    kicker: "Crypto++ · Reported commit gap",
    say: "Ben Sigman identified a reported gap in recorded Crypto++ commits, beginning February 2, 2008.",
  },
  {
    type: "gap", scene: 39, t: 2008.9, step: 2,
    kicker: "Crypto++ · Reported commit gap",
    say: "The reported gap runs to November 21, 2008 — more than nine months.",
  },
  {
    type: "gap", scene: 39, t: 2008.9, step: 3,
    kicker: "Crypto++ · Reported commit gap",
    say: "It overlaps Bitcoin development. But a version-control gap does not tell us what Wei Dai was doing—and the historical log needs independent audit.",
  },
  {
    type: "statement", scene: 40, t: 2008.64,
    kicker: "August 20, 2008", title: "A blog goes\ninto *reruns*.",
    sub: "Nick Szabo’s. The same day, Satoshi writes to Adam Back. Striking — but not evidence.",
  },

  // ============================================================ VI
  { type: "chapter", section: "VI · Bitcoin", kicker: "Chapter VI", title: "Bitcoin", sub: "2008 – 2009", range: [2008.6, 2009.3] },
  {
    type: "quote", scene: 41, t: 2008.64, size: 46,
    kicker: "August 20, 2008 · A stranger writes",
    quote: "“I’m getting ready to release a paper that references your *Hashcash* paper and I wanted to make sure I have the citation right.”",
    by: "Satoshi Nakamoto, first email to Adam Back",
    say: "Satoshi sent Adam Back a draft paper about electronic cash.",
  },
  {
    type: "quote", scene: 41, t: 2008.64, size: 46,
    kicker: "Adam Back replies",
    quote: "“You maybe aware of the ‘B-money’ proposal … by *Wei Dai* which sounds to be somewhat related to your paper.”",
    by: "Adam Back, reply to Satoshi",
    say: "Back recognized a link to Hashcash and directed Satoshi toward Wei Dai's b-money. The first surviving clues to the anonymous creator now appear in writing.",
  },
  {
    type: "quote", scene: 42, t: 2008.64,
    kicker: "August 21, 2008 · Satoshi to Adam Back",
    quote: "“Thanks, *I wasn’t aware of the b-money page*, but my ideas start from exactly that point.”",
    by: "Satoshi Nakamoto, email to Adam Back",
    say: "Satoshi told Back that he had not been aware of the b-money page.",
  },
  {
    type: "statement", scene: 42, t: 2008.64,
    kicker: "August 21, 2008", title: "Hal Finney had known\nWei Dai for *years*.",
    sub: "Independent? Careful wording? Concealment?\nThe email alone cannot tell us.",
    say: "Hal Finney, by contrast, had known Wei Dai for years. Was Satoshi genuinely independent, carefully choosing his words, or concealing a relationship? The email alone cannot tell us.",
  },
  {
    type: "statement", scene: 43, t: 2008.83, size: 76,
    kicker: "October 31, 2008", title: "Bitcoin: A Peer-to-Peer\nElectronic Cash System",
    sub: "An unknown author. Familiar inventions — combined into agreement *without a trusted issuer*.",
  },
  {
    type: "refs", scene: 44, t: 2008.83,
    kicker: "The whitepaper", title: "Eight references",
    items: [
      [1, "W. Dai", "b-money", "1998"],
      [2, "H. Massias et al.", "Secure timestamping with minimal trust", "1999"],
      [3, "S. Haber, W.S. Stornetta", "How to time-stamp a digital document", "1991"],
      [4, "D. Bayer et al.", "Efficiency of digital time-stamping", "1993"],
      [5, "S. Haber, W.S. Stornetta", "Secure names for bit-strings", "1997"],
      [6, "A. Back", "Hashcash — a denial of service counter-measure", "2002"],
      [7, "R.C. Merkle", "Protocols for public key cryptosystems", "1980"],
      [8, "W. Feller", "An introduction to probability theory", "1957"],
    ],
  },
  {
    type: "statement", scene: 45, t: 2008.83,
    kicker: "The whitepaper", title: "Two names\nare *missing*.",
    say: "Two especially close predecessors are absent from the bibliography.",
  },
  {
    type: "statement", scene: 45, t: 2008.83, size: 96,
    kicker: "Not cited", title: "*Nick Szabo.*\n*Hal Finney.*",
    sub: "Oversight, editorial judgment, or deliberate distancing? The motive is unknown.",
  },
  {
    type: "statement", scene: 46, t: 2008.88,
    kicker: "November 2008 · Bitcoin source", title: "Bitcoin was still\n*changing*.",
    sub: "The code existed before launch — and its monetary parameters were still being refined.",
  },
  {
    type: "statement", scene: 47, t: 2009,
    kicker: "Bitcoin v0.1 · SHA-256", title: "Inside Bitcoin:\n*Wei Dai’s* code.",
    sub: "SHA-256 code descended from Crypto++. Proof of reuse — not of authorship.",
  },
  {
    type: "quote", scene: 48, t: 2009.03, size: 130, maxLines: 1,
    kicker: "January 2009",
    quote: "“Running *bitcoin*”",
    by: "Hal Finney, on Twitter",
    say: "Hal Finney became one of Bitcoin's first users. He ran the software, reported crashes, and helped debug its early versions.",
  },
  {
    type: "figure", scene: 48, t: 2009.03,
    kicker: "January 12, 2009", title: "*10* bitcoin",
    sub: "Satoshi → Hal: the first widely recognized person-to-person Bitcoin transaction.",
    say: "On January 12, Satoshi sent him 10 bitcoin—the first widely recognized person-to-person Bitcoin transaction.",
  },
  {
    type: "statement", scene: 49, t: 2009.05,
    kicker: "January 2009 · Hal–Satoshi emails", title: "Tester and\n*developer*.",
    sub: "Hal reported bugs. Satoshi replied with fixes and deep knowledge of the C++ code.",
  },
  {
    type: "figure", scene: 50, t: 2009.29,
    kicker: "April 18, 2009 · Santa Barbara", title: "*10* miles",
    sub: "Hal runs a documented ten-mile race.",
    say: "Hal ran a documented ten-mile race in Santa Barbara.",
  },
  {
    type: "statement", scene: 50, t: 2009.29,
    kicker: "April 18, 2009", title: "Satoshi appears\nto be *active*.",
    sub: "A serious problem for any theory that Hal ran the identity alone.",
    say: "Meanwhile, Satoshi appeared to be active. It is a serious problem for any theory that Hal operated the identity entirely alone. The simplest explanation remains that two different people were involved.",
  },

  // ============================================================ VII
  { type: "chapter", section: "VII · The Theory", kicker: "Chapter VII", title: "The Theory", sub: "One name. More than one person?" },
  {
    type: "statement", scene: 51,
    kicker: "The alibi changes the question", title: "What if Satoshi\nwasn’t *one person*?",
    say: "What if 'Satoshi Nakamoto' named a project, not a person?",
  },
  {
    type: "statement", scene: 51,
    kicker: "A hypothesis", title: "A project,\nnot a person?",
    sub: "One engineer designing the software. Another handling correspondence and releases.",
    say: "One engineer might have designed software, while another handled correspondence and releases. It is an intriguing explanation for apparent contradictions—but possibility alone does not demonstrate that such a partnership existed.",
  },
  {
    type: "person", scene: 52, image: "sassaman.png",
    kicker: "Len returns", title: "Len Sassaman",
    sub: "Knew Hal. Understood pseudonymous cryptography. Encouraged authors to use *pseudonyms*.",
    say: "Len Sassaman knew Hal and understood the world of pseudonymous cryptography. Bram Cohen remembered Len encouraging software authors to use pseudonyms.",
  },
  {
    type: "statement", scene: 52,
    kicker: "Finding Satoshi", title: "Did Len\nhelp Hal?",
    sub: "The documentary proposes it. Friendship and expertise do not prove it.",
    say: "Finding Satoshi proposes that Len may have assisted Hal. Neither friendship nor anonymity expertise proves that he did.",
  },
  {
    type: "hypothesis",
    kicker: "The hypothesis",
    sub: "Possible. *Not proven.*",
    notes: "The hypothesis this presentation explores: Hal Finney, working with one or more of Len Sassaman, Nick Szabo and Wei Dai.\n\nHypothesis, not established fact. Each connection rests on documented relationships and circumstantial timing, not on evidence of coordination.",
  },
  {
    type: "list", scene: 53,
    kicker: "The theory meets its limits",
    items: [
      "Hal *denied* being Satoshi.",
      "His emails read like correspondence with *another developer*.",
      "Len reportedly *criticized* Bitcoin.",
      "Wei’s commit gap has *innocent explanations*.",
    ],
    say: "Hal denied being Satoshi. His emails read like correspondence with another developer. Len reportedly criticized Bitcoin. Wei's commit gap has innocent explanations.",
  },
  {
    type: "statement", scene: 53,
    kicker: "The case is not closed", title: "A compelling hypothesis\nis not *proof*.",
    sub: "It competes with a simpler possibility: Satoshi was someone else.",
    say: "The multi-person theory is possible, but it must compete with a simpler possibility: Satoshi was someone else.",
  },

  // ============================================================ VIII
  { type: "chapter", section: "VIII · Hal", kicker: "Chapter VIII", title: "Hal", sub: "2009 – 2014", range: [2009, 2014] },
  {
    type: "statement", scene: 54, t: 2009.3,
    kicker: "2009 · Age 52", title: "The runner.",
    sub: "As Bitcoin began, Hal was in excellent physical condition.",
  },
  {
    type: "figure", scene: 55, t: 2009.6,
    kicker: "August 2009 · Age 53", title: "ALS",
    sub: "Seven months after Bitcoin’s launch.",
  },
  {
    type: "statement", scene: 56, t: 2009.95,
    kicker: "December 2009", title: "The finish line.",
    sub: "Fran turned a marathon into an ALS fundraiser. Hal joined the final stretch — and crossed the line.",
  },
  {
    type: "statement", scene: 57, t: 2013.2,
    kicker: "2013 · Age 56", title: "Bitcoin and Me",
    sub: "Written with assistive technology. He wrote about Satoshi as *someone else*.",
  },
  {
    type: "photo", scene: 58, t: 2014, image: "hal-and-fran.jpg",
    kicker: "August 28, 2014", title: "Hal Finney\n1956 – 2014",
    sub: "Encryption for ordinary people. A working digital-cash experiment. One of Bitcoin’s first advocates.",
    say: "Hal Finney died on August 28, 2014. He helped make encryption available to ordinary people, built a remarkable digital-cash experiment, and became one of Bitcoin's first advocates.",
  },
  {
    type: "statement", scene: 58, t: 2014,
    kicker: "Who was Satoshi? · Still unresolved", title: "His documented\nachievements need\n*no mystery* to matter.",
    say: "Whether he secretly helped invent Bitcoin remains unresolved. His documented achievements need no mystery to matter.",
  },
];
