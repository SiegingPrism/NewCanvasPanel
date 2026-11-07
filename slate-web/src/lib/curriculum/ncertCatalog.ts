/**
 * NCERT & CBSE Official Curriculum Textbook Catalog
 *
 * All entries map strictly to official NCERT portal URLs on ncert.nic.in.
 * In accordance with NCERT's digital publication guidelines, all content
 * points directly to official government portal links.
 * State board books (e.g. Maharashtra Balbharati) are omitted until verified official portal feeds are integrated.
 */

export type BoardType = "cbse";
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type StreamBranch = "science" | "commerce" | "arts" | "general";
export type MediumLanguage = "english" | "hindi";

export interface TextbookChapter {
  chapterNumber: number;
  title: string;
  hindiTitle?: string;
  pdfCode: string;
  officialUrl: string; // Official NCERT URL (https://ncert.nic.in/textbook/pdf/{pdfCode})
}

export interface TextbookBook {
  id: string;
  title: string;
  hindiTitle?: string;
  board: BoardType;
  grade: GradeLevel;
  subject: string;
  branch?: StreamBranch;
  medium: MediumLanguage;
  editionYear: string;
  officialPublisher: string;
  coverColor: string;
  chapters: TextbookChapter[];
}

/**
 * Institutional & Teacher Permission Switch
 * Digital textbook integration requires institutional licensing / publisher agreement.
 * Disabled by default to comply with publisher copyright terms.
 */
export function isTextbookLibraryPermitted(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("slate_curriculum_textbooks_enabled") === "true";
}

export function setTextbookLibraryPermitted(permitted: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("slate_curriculum_textbooks_enabled", permitted ? "true" : "false");
}

/**
 * Server Catalog & 24-hour Daily Check Architecture
 */
const CATALOG_STORAGE_KEY = "slate_curriculum_catalog_cache";
const LAST_CHECK_KEY = "slate_curriculum_catalog_last_check";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CatalogSyncResult {
  source: "server" | "cache" | "bundled";
  lastChecked: string;
  bookCount: number;
  isOnline: boolean;
  message: string;
}

export const NCERT_CATALOG: TextbookBook[] = [
  {
    "id": "ncert-class-1-math-joyful",
    "title": "Joyful Mathematics (Class 1)",
    "hindiTitle": "आनंदमय गणित (कक्षा 1)",
    "board": "cbse",
    "grade": 1,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-amber-500 to-orange-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Finding the Furry Cat (Pre-number Concepts)",
        "pdfCode": "aejm101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "What is Long? What is Round? (Shapes)",
        "pdfCode": "aejm102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Mango Treat (Numbers 1 to 9)",
        "pdfCode": "aejm103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Making 10 (Numbers 10 to 20)",
        "pdfCode": "aejm104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "How Many? (Addition & Subtraction)",
        "pdfCode": "aejm105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Vegetable Farm (Addition & Subtraction up to 20)",
        "pdfCode": "aejm106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Lina’s Family (Measurement)",
        "pdfCode": "aejm107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Fun with Numbers (Numbers 21 to 99)",
        "pdfCode": "aejm108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Utsav (Patterns)",
        "pdfCode": "aejm109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "How do I Spend My Day? (Time)",
        "pdfCode": "aejm110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "How Many Times? (Multiplication)",
        "pdfCode": "aejm111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "How Much Can We Spend? (Money)",
        "pdfCode": "aejm112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "So Many Toys (Data Handling)",
        "pdfCode": "aejm113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aejm113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-1-english-mridang",
    "title": "Mridang (Class 1 English)",
    "hindiTitle": "मृदंग (कक्षा 1 अंग्रेज़ी)",
    "board": "cbse",
    "grade": 1,
    "subject": "English",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-sky-500 to-blue-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Two Little Hands",
        "pdfCode": "aeen101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Greetings",
        "pdfCode": "aeen102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Picture Reading",
        "pdfCode": "aeen103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "The Cap-seller and the Monkeys",
        "pdfCode": "aeen104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "A Farm",
        "pdfCode": "aeen105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Fun with Words",
        "pdfCode": "aeen106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "The Food We Eat",
        "pdfCode": "aeen107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "The Four Seasons",
        "pdfCode": "aeen108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Anandi’s Rainbow",
        "pdfCode": "aeen109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aeen109.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-1-hindi-sarangi",
    "title": "Sarangi (Class 1 Hindi)",
    "hindiTitle": "सारंगी (कक्षा 1 हिन्दी)",
    "board": "cbse",
    "grade": 1,
    "subject": "Hindi",
    "branch": "general",
    "medium": "hindi",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-rose-500 to-red-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "मीना का परिवार",
        "pdfCode": "aehn101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "दादा-दादी",
        "pdfCode": "aehn102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "रीना का दिन",
        "pdfCode": "aehn103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "रानी भी",
        "pdfCode": "aehn104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "वाह, मेरे घोड़े!",
        "pdfCode": "aehn105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "तीन साथी",
        "pdfCode": "aehn106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "पतंग",
        "pdfCode": "aehn107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "गेंद और बल्ला",
        "pdfCode": "aehn108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "बंदर और गिलहरी",
        "pdfCode": "aehn109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "पगड़ी",
        "pdfCode": "aehn110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/aehn110.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-2-math-joyful",
    "title": "Joyful Mathematics (Class 2)",
    "hindiTitle": "आनंदमय गणित (कक्षा 2)",
    "board": "cbse",
    "grade": 2,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-amber-500 to-yellow-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "A Day at the Beach",
        "pdfCode": "bejm101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Shapes Around Us",
        "pdfCode": "bejm102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Fun with Numbers",
        "pdfCode": "bejm103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Shadow Story",
        "pdfCode": "bejm104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Playing with Lines",
        "pdfCode": "bejm105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Decoration for Festival",
        "pdfCode": "bejm106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Rani’s Gift",
        "pdfCode": "bejm107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Group and Share",
        "pdfCode": "bejm108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Which Season is It?",
        "pdfCode": "bejm109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Fun at the Fair",
        "pdfCode": "bejm110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Data Handling",
        "pdfCode": "bejm111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/bejm111.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-3-math-mela",
    "title": "Maths Mela (Class 3 Mathematics)",
    "hindiTitle": "गणित मेला (कक्षा 3)",
    "board": "cbse",
    "grade": 3,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-500 to-cyan-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Where to Look From",
        "pdfCode": "cemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Fun with Numbers",
        "pdfCode": "cemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Give and Take",
        "pdfCode": "cemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Long and Short",
        "pdfCode": "cemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Shapes and Designs",
        "pdfCode": "cemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Fun with Give and Take",
        "pdfCode": "cemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Time Goes On...",
        "pdfCode": "cemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Who is Heavier?",
        "pdfCode": "cemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "How Many Times?",
        "pdfCode": "cemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Play with Patterns",
        "pdfCode": "cemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Jugs and Mugs",
        "pdfCode": "cemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Can We Share?",
        "pdfCode": "cemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Smart Charts!",
        "pdfCode": "cemh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh113.pdf"
      },
      {
        "chapterNumber": 14,
        "title": "Rupees and Paise",
        "pdfCode": "cemh114.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/cemh114.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-3-evs-world",
    "title": "Our Wondrous World (Class 3 EVS)",
    "hindiTitle": "हमारा अद्भुत संसार (कक्षा 3)",
    "board": "cbse",
    "grade": 3,
    "subject": "Environmental Studies",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-emerald-500 to-green-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Poonam’s Day Out",
        "pdfCode": "ceap101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "The Plant Fairy",
        "pdfCode": "ceap102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Water O’ Water!",
        "pdfCode": "ceap103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Our First School",
        "pdfCode": "ceap104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Chhotu’s House",
        "pdfCode": "ceap105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Foods We Eat",
        "pdfCode": "ceap106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Saying without Speaking",
        "pdfCode": "ceap107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Flying High",
        "pdfCode": "ceap108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "It’s Raining",
        "pdfCode": "ceap109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "What is Cooking",
        "pdfCode": "ceap110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/ceap110.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-4-math-mela",
    "title": "Maths Mela (Class 4 Mathematics)",
    "hindiTitle": "गणित का जादू / मेला (कक्षा 4)",
    "board": "cbse",
    "grade": 4,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Building with Bricks",
        "pdfCode": "demh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Long and Short",
        "pdfCode": "demh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "A Trip to Bhopal",
        "pdfCode": "demh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Tick-Tick-Tick",
        "pdfCode": "demh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "The Way The World Looks",
        "pdfCode": "demh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "The Junk Seller",
        "pdfCode": "demh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Jugs and Mugs",
        "pdfCode": "demh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Carts and Wheels",
        "pdfCode": "demh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Halves and Quarters",
        "pdfCode": "demh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Play with Patterns",
        "pdfCode": "demh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Tables and Shares",
        "pdfCode": "demh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "How Heavy? How Light?",
        "pdfCode": "demh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Fields and Fences",
        "pdfCode": "demh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh113.pdf"
      },
      {
        "chapterNumber": 14,
        "title": "Smart Charts",
        "pdfCode": "demh114.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/demh114.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-5-math-mela",
    "title": "Maths Mela (Class 5 Mathematics)",
    "hindiTitle": "गणित मेला (कक्षा 5)",
    "board": "cbse",
    "grade": 5,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-indigo-500 to-purple-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "The Fish Tale",
        "pdfCode": "eemm101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Shapes and Angles",
        "pdfCode": "eemm102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "How Many Squares?",
        "pdfCode": "eemm103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Parts and Wholes",
        "pdfCode": "eemm104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Does it Look the Same?",
        "pdfCode": "eemm105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Be My Multiple, I'll be Your Factor",
        "pdfCode": "eemm106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Can You See the Pattern?",
        "pdfCode": "eemm107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Mapping Your Way",
        "pdfCode": "eemm108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Boxes and Sketches",
        "pdfCode": "eemm109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Tenths and Hundredths",
        "pdfCode": "eemm110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Area and its Boundary",
        "pdfCode": "eemm111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Smart Charts",
        "pdfCode": "eemm112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Ways to Multiply and Divide",
        "pdfCode": "eemm113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm113.pdf"
      },
      {
        "chapterNumber": 14,
        "title": "How Big? How Heavy?",
        "pdfCode": "eemm114.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eemm114.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-5-evs-world",
    "title": "Our Wondrous World (Class 5 EVS)",
    "hindiTitle": "हमारा अद्भुत संसार (कक्षा 5)",
    "board": "cbse",
    "grade": 5,
    "subject": "Environmental Studies",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-teal-500 to-emerald-600",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Super Senses",
        "pdfCode": "eeww101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "A Snake Charmer's Story",
        "pdfCode": "eeww102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "From Tasting to Digesting",
        "pdfCode": "eeww103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Mangoes Round the Year",
        "pdfCode": "eeww104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Seeds and Seeds",
        "pdfCode": "eeww105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Every Drop Counts",
        "pdfCode": "eeww106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Experiments with Water",
        "pdfCode": "eeww107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "A Treat for Mosquitoes",
        "pdfCode": "eeww108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Up You Go!",
        "pdfCode": "eeww109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Walls Tell Stories",
        "pdfCode": "eeww110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Sunita in Space",
        "pdfCode": "eeww111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "What if it Finishes...?",
        "pdfCode": "eeww112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/eeww112.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-6-math-prakash",
    "title": "Ganita Prakash (Class 6 Mathematics)",
    "hindiTitle": "गणित प्रकाश (कक्षा 6)",
    "board": "cbse",
    "grade": 6,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Patterns in Mathematics",
        "pdfCode": "femh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Lines and Angles",
        "pdfCode": "femh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Number Play",
        "pdfCode": "femh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Data Handling and Presentation",
        "pdfCode": "femh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Prime Time",
        "pdfCode": "femh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Perimeter and Area",
        "pdfCode": "femh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Fractions",
        "pdfCode": "femh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Playing with Constructions",
        "pdfCode": "femh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Symmetry",
        "pdfCode": "femh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "The Other Side of Zero",
        "pdfCode": "femh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/femh110.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-6-science-curiosity",
    "title": "Curiosity (Class 6 Science)",
    "hindiTitle": "जिज्ञासा (कक्षा 6 विज्ञान)",
    "board": "cbse",
    "grade": 6,
    "subject": "Science",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-emerald-600 to-teal-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "The Wonderful World of Science",
        "pdfCode": "fesc101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Diversity in the Living World",
        "pdfCode": "fesc102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Mindful Eating: A Path to a Healthy Body",
        "pdfCode": "fesc103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Exploring Magnets",
        "pdfCode": "fesc104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Measurement of Length and Motion",
        "pdfCode": "fesc105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Materials Around Us",
        "pdfCode": "fesc106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Temperature and its Measurement",
        "pdfCode": "fesc107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "A Journey through States of Water",
        "pdfCode": "fesc108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Methods of Separation in Everyday Life",
        "pdfCode": "fesc109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Living Creatures: Exploring their Characteristics",
        "pdfCode": "fesc110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Nature's Treasures",
        "pdfCode": "fesc111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Beyond Earth",
        "pdfCode": "fesc112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/fesc112.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-7-math",
    "title": "Mathematics (Class 7)",
    "hindiTitle": "गणित (कक्षा 7)",
    "board": "cbse",
    "grade": 7,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Integers",
        "pdfCode": "gemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Fractions and Decimals",
        "pdfCode": "gemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Data Handling",
        "pdfCode": "gemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Simple Equations",
        "pdfCode": "gemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Lines and Angles",
        "pdfCode": "gemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "The Triangle and its Properties",
        "pdfCode": "gemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Comparing Quantities",
        "pdfCode": "gemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Rational Numbers",
        "pdfCode": "gemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Perimeter and Area",
        "pdfCode": "gemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Algebraic Expressions",
        "pdfCode": "gemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Exponents and Powers",
        "pdfCode": "gemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Symmetry",
        "pdfCode": "gemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Visualising Solid Shapes",
        "pdfCode": "gemh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gemh113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-7-science",
    "title": "Science (Class 7)",
    "hindiTitle": "विज्ञान (कक्षा 7)",
    "board": "cbse",
    "grade": 7,
    "subject": "Science",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-teal-600 to-emerald-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Nutrition in Plants",
        "pdfCode": "gesc101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Nutrition in Animals",
        "pdfCode": "gesc102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Heat",
        "pdfCode": "gesc103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Acids, Bases and Salts",
        "pdfCode": "gesc104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Physical and Chemical Changes",
        "pdfCode": "gesc105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Respiration in Organisms",
        "pdfCode": "gesc106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Transportation in Animals and Plants",
        "pdfCode": "gesc107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Reproduction in Plants",
        "pdfCode": "gesc108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Motion and Time",
        "pdfCode": "gesc109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Electric Current and its Effects",
        "pdfCode": "gesc110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Light",
        "pdfCode": "gesc111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Forests: Our Lifeline",
        "pdfCode": "gesc112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Wastewater Story",
        "pdfCode": "gesc113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/gesc113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-8-math",
    "title": "Mathematics (Class 8)",
    "hindiTitle": "गणित (कक्षा 8)",
    "board": "cbse",
    "grade": 8,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Rational Numbers",
        "pdfCode": "hemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Linear Equations in One Variable",
        "pdfCode": "hemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Understanding Quadrilaterals",
        "pdfCode": "hemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Data Handling",
        "pdfCode": "hemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Square and Square Roots",
        "pdfCode": "hemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Cube and Cube Roots",
        "pdfCode": "hemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Comparing Quantities",
        "pdfCode": "hemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Algebraic Expressions and Identities",
        "pdfCode": "hemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Mensuration",
        "pdfCode": "hemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Exponents and Powers",
        "pdfCode": "hemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Direct and Inverse Proportions",
        "pdfCode": "hemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Factorisation",
        "pdfCode": "hemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Introduction to Graphs",
        "pdfCode": "hemh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hemh113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-8-science",
    "title": "Science (Class 8)",
    "hindiTitle": "विज्ञान (कक्षा 8)",
    "board": "cbse",
    "grade": 8,
    "subject": "Science",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-teal-600 to-emerald-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Crop Production and Management",
        "pdfCode": "hesc101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Microorganisms: Friend and Foe",
        "pdfCode": "hesc102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Coal and Petroleum",
        "pdfCode": "hesc103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Combustion and Flame",
        "pdfCode": "hesc104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Conservation of Plants and Animals",
        "pdfCode": "hesc105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Reproduction in Animals",
        "pdfCode": "hesc106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Reaching the Age of Adolescence",
        "pdfCode": "hesc107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Force and Pressure",
        "pdfCode": "hesc108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Friction",
        "pdfCode": "hesc109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Sound",
        "pdfCode": "hesc110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Chemical Effects of Electric Current",
        "pdfCode": "hesc111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Some Natural Phenomena",
        "pdfCode": "hesc112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Light",
        "pdfCode": "hesc113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/hesc113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-9-math-manjari",
    "title": "Ganita Manjari (Class 9 Mathematics)",
    "hindiTitle": "गणित मंजरी (कक्षा 9)",
    "board": "cbse",
    "grade": 9,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Number Systems",
        "pdfCode": "iemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Polynomials",
        "pdfCode": "iemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Coordinate Geometry",
        "pdfCode": "iemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Linear Equations in Two Variables",
        "pdfCode": "iemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Introduction to Euclid’s Geometry",
        "pdfCode": "iemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Lines and Angles",
        "pdfCode": "iemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Triangles",
        "pdfCode": "iemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Quadrilaterals",
        "pdfCode": "iemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Circles",
        "pdfCode": "iemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Heron’s Formula",
        "pdfCode": "iemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Surface Areas and Volumes",
        "pdfCode": "iemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Statistics",
        "pdfCode": "iemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iemh112.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-9-science-exploration",
    "title": "Exploration (Class 9 Science)",
    "hindiTitle": "अन्वेषण (कक्षा 9 विज्ञान)",
    "board": "cbse",
    "grade": 9,
    "subject": "Science",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-emerald-600 to-teal-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Matter in Our Surroundings",
        "pdfCode": "iesc101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Is Matter Around Us Pure",
        "pdfCode": "iesc102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Atoms and Molecules",
        "pdfCode": "iesc103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Structure of the Atom",
        "pdfCode": "iesc104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "The Fundamental Unit of Life",
        "pdfCode": "iesc105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Tissues",
        "pdfCode": "iesc106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Motion",
        "pdfCode": "iesc107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Force and Laws of Motion",
        "pdfCode": "iesc108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Gravitation",
        "pdfCode": "iesc109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Work and Energy",
        "pdfCode": "iesc110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Sound",
        "pdfCode": "iesc111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Improvement in Food Resources",
        "pdfCode": "iesc112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/iesc112.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-10-math",
    "title": "Mathematics (Class 10)",
    "hindiTitle": "गणित (कक्षा 10)",
    "board": "cbse",
    "grade": 10,
    "subject": "Mathematics",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Real Numbers",
        "pdfCode": "jemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Polynomials",
        "pdfCode": "jemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Pair of Linear Equations in Two Variables",
        "pdfCode": "jemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Quadratic Equations",
        "pdfCode": "jemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Arithmetic Progressions",
        "pdfCode": "jemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Triangles",
        "pdfCode": "jemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Coordinate Geometry",
        "pdfCode": "jemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Introduction to Trigonometry",
        "pdfCode": "jemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Some Applications of Trigonometry",
        "pdfCode": "jemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Circles",
        "pdfCode": "jemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Areas Related to Circles",
        "pdfCode": "jemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Surface Areas and Volumes",
        "pdfCode": "jemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Statistics",
        "pdfCode": "jemh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh113.pdf"
      },
      {
        "chapterNumber": 14,
        "title": "Probability",
        "pdfCode": "jemh114.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jemh114.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-10-science",
    "title": "Science (Class 10)",
    "hindiTitle": "विज्ञान (कक्षा 10)",
    "board": "cbse",
    "grade": 10,
    "subject": "Science",
    "branch": "general",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-emerald-600 to-teal-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Chemical Reactions and Equations",
        "pdfCode": "jesc101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Acids, Bases and Salts",
        "pdfCode": "jesc102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Metals and Non-metals",
        "pdfCode": "jesc103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Carbon and its Compounds",
        "pdfCode": "jesc104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Life Processes",
        "pdfCode": "jesc105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Control and Coordination",
        "pdfCode": "jesc106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "How do Organisms Reproduce?",
        "pdfCode": "jesc107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Heredity",
        "pdfCode": "jesc108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Light – Reflection and Refraction",
        "pdfCode": "jesc109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "The Human Eye and the Colourful World",
        "pdfCode": "jesc110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Electricity",
        "pdfCode": "jesc111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Magnetic Effects of Electric Current",
        "pdfCode": "jesc112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Our Environment",
        "pdfCode": "jesc113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/jesc113.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-11-math",
    "title": "Mathematics (Class 11)",
    "hindiTitle": "गणित (कक्षा 11)",
    "board": "cbse",
    "grade": 11,
    "subject": "Mathematics",
    "branch": "science",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-600 to-indigo-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Sets",
        "pdfCode": "kemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Relations and Functions",
        "pdfCode": "kemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Trigonometric Functions",
        "pdfCode": "kemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Complex Numbers and Quadratic Equations",
        "pdfCode": "kemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Linear Inequalities",
        "pdfCode": "kemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Permutations and Combinations",
        "pdfCode": "kemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Binomial Theorem",
        "pdfCode": "kemh107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Sequences and Series",
        "pdfCode": "kemh108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh108.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Straight Lines",
        "pdfCode": "kemh109.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh109.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Conic Sections",
        "pdfCode": "kemh110.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh110.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Introduction to Three Dimensional Geometry",
        "pdfCode": "kemh111.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh111.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Limits and Derivatives",
        "pdfCode": "kemh112.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh112.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Statistics",
        "pdfCode": "kemh113.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh113.pdf"
      },
      {
        "chapterNumber": 14,
        "title": "Probability",
        "pdfCode": "kemh114.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/kemh114.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-11-physics-1",
    "title": "Physics Part 1 (Class 11)",
    "hindiTitle": "भौतिकी भाग 1 (कक्षा 11)",
    "board": "cbse",
    "grade": 11,
    "subject": "Physics",
    "branch": "science",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-violet-600 to-purple-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Units and Measurements",
        "pdfCode": "keph101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Motion in a Straight Line",
        "pdfCode": "keph102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Motion in a Plane",
        "pdfCode": "keph103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Laws of Motion",
        "pdfCode": "keph104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Work, Energy and Power",
        "pdfCode": "keph105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "System of Particles and Rotational Motion",
        "pdfCode": "keph106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Gravitation",
        "pdfCode": "keph107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/keph107.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-math-1",
    "title": "Mathematics Part 1 (Class 12)",
    "hindiTitle": "गणित भाग 1 (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Mathematics",
    "branch": "science",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-700 to-indigo-800",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Relations and Functions",
        "pdfCode": "lemh101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Inverse Trigonometric Functions",
        "pdfCode": "lemh102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Matrices",
        "pdfCode": "lemh103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Determinants",
        "pdfCode": "lemh104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Continuity and Differentiability",
        "pdfCode": "lemh105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Application of Derivatives",
        "pdfCode": "lemh106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh106.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-math-2",
    "title": "Mathematics Part 2 (Class 12)",
    "hindiTitle": "गणित भाग 2 (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Mathematics",
    "branch": "science",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-blue-700 to-indigo-800",
    "chapters": [
      {
        "chapterNumber": 7,
        "title": "Integrals",
        "pdfCode": "lemh201.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh201.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Application of Integrals",
        "pdfCode": "lemh202.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh202.pdf"
      },
      {
        "chapterNumber": 9,
        "title": "Differential Equations",
        "pdfCode": "lemh203.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh203.pdf"
      },
      {
        "chapterNumber": 10,
        "title": "Vector Algebra",
        "pdfCode": "lemh204.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh204.pdf"
      },
      {
        "chapterNumber": 11,
        "title": "Three Dimensional Geometry",
        "pdfCode": "lemh205.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh205.pdf"
      },
      {
        "chapterNumber": 12,
        "title": "Linear Programming",
        "pdfCode": "lemh206.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh206.pdf"
      },
      {
        "chapterNumber": 13,
        "title": "Probability",
        "pdfCode": "lemh207.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/lemh207.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-physics-1",
    "title": "Physics Part 1 (Class 12)",
    "hindiTitle": "भौतिकी भाग 1 (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Physics",
    "branch": "science",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-violet-700 to-purple-800",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Electric Charges and Fields",
        "pdfCode": "leph101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Electrostatic Potential and Capacitance",
        "pdfCode": "leph102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Current Electricity",
        "pdfCode": "leph103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Moving Charges and Magnetism",
        "pdfCode": "leph104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Magnetism and Matter",
        "pdfCode": "leph105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Electromagnetic Induction",
        "pdfCode": "leph106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Alternating Current",
        "pdfCode": "leph107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph107.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Electromagnetic Waves",
        "pdfCode": "leph108.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leph108.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-microeconomics",
    "title": "Introductory Microeconomics (Class 12)",
    "hindiTitle": "व्यष्टि अर्थशास्त्र एक परिचय (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Economics",
    "branch": "commerce",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-amber-600 to-orange-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Introduction to Microeconomics",
        "pdfCode": "leec201.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec201.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Theory of Consumer Behaviour",
        "pdfCode": "leec202.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec202.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Production and Costs",
        "pdfCode": "leec203.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec203.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "The Theory of the Firm under Perfect Competition",
        "pdfCode": "leec204.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec204.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Market Equilibrium",
        "pdfCode": "leec205.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec205.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Non-Competitive Markets",
        "pdfCode": "leec206.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec206.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-macroeconomics",
    "title": "Introductory Macroeconomics (Class 12)",
    "hindiTitle": "समष्टि अर्थशास्त्र एक परिचय (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Economics",
    "branch": "commerce",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-amber-600 to-yellow-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Introduction to Macroeconomics",
        "pdfCode": "leec101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "National Income Accounting",
        "pdfCode": "leec102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Money and Banking",
        "pdfCode": "leec103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "Determination of Income and Employment",
        "pdfCode": "leec104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Government Budget and the Economy",
        "pdfCode": "leec105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Open Economy Macroeconomics",
        "pdfCode": "leec106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leec106.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-pol-science-2",
    "title": "Politics in India since Independence (Class 12)",
    "hindiTitle": "स्वतंत्र भारत में राजनीति (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Political Science",
    "branch": "arts",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-red-600 to-rose-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Challenges of Nation Building",
        "pdfCode": "leps201.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps201.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Era of One-Party Dominance",
        "pdfCode": "leps202.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps202.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Politics of Planned Development",
        "pdfCode": "leps203.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps203.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "India’s External Relations",
        "pdfCode": "leps204.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps204.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Challenges to and Restoration of the Congress System",
        "pdfCode": "leps205.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps205.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "The Crisis of Democratic Order",
        "pdfCode": "leps206.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps206.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Regional Aspirations",
        "pdfCode": "leps207.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps207.pdf"
      },
      {
        "chapterNumber": 8,
        "title": "Recent Developments in Indian Politics",
        "pdfCode": "leps208.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps208.pdf"
      }
    ]
  },
  {
    "id": "ncert-class-12-pol-science-1",
    "title": "Contemporary World Politics (Class 12)",
    "hindiTitle": "समकालीन विश्व राजनीति (कक्षा 12)",
    "board": "cbse",
    "grade": 12,
    "subject": "Political Science",
    "branch": "arts",
    "medium": "english",
    "editionYear": "National Curriculum (NEP)",
    "officialPublisher": "NCERT (Government of India)",
    "coverColor": "from-red-600 to-orange-700",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "The End of Bipolarity",
        "pdfCode": "leps101.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps101.pdf"
      },
      {
        "chapterNumber": 2,
        "title": "Contemporary Centres of Power",
        "pdfCode": "leps102.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps102.pdf"
      },
      {
        "chapterNumber": 3,
        "title": "Contemporary South Asia",
        "pdfCode": "leps103.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps103.pdf"
      },
      {
        "chapterNumber": 4,
        "title": "International Organisations",
        "pdfCode": "leps104.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps104.pdf"
      },
      {
        "chapterNumber": 5,
        "title": "Security in the Contemporary World",
        "pdfCode": "leps105.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps105.pdf"
      },
      {
        "chapterNumber": 6,
        "title": "Environment and Natural Resources",
        "pdfCode": "leps106.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps106.pdf"
      },
      {
        "chapterNumber": 7,
        "title": "Globalisation",
        "pdfCode": "leps107.pdf",
        "officialUrl": "https://ncert.nic.in/textbook/pdf/leps107.pdf"
      }
    ]
  }
];

/**
 * Retrieves the active textbook catalog, honoring cached remote catalog updates
 */
export function getActiveCatalog(): TextbookBook[] {
  if (typeof localStorage === "undefined") return NCERT_CATALOG;
  try {
    const cached = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to bundled
  }
  return NCERT_CATALOG;
}

/**
 * Checks the server for catalog updates with a 24-hour interval check.
 * Honest status reporting with clean offline fallback.
 */
export async function syncCatalogWithServer(force = false): Promise<{
  catalog: TextbookBook[];
  result: CatalogSyncResult;
}> {
  const now = Date.now();
  const lastCheckStr = typeof localStorage !== "undefined" ? localStorage.getItem(LAST_CHECK_KEY) : null;
  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;

  // Check if check is needed
  if (!force && lastCheck > 0 && now - lastCheck < CHECK_INTERVAL_MS) {
    const current = getActiveCatalog();
    return {
      catalog: current,
      result: {
        source: "cache",
        lastChecked: new Date(lastCheck).toLocaleDateString(),
        bookCount: current.length,
        isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
        message: "Catalog up to date (checked within last 24h).",
      },
    };
  }

  // Attempt server fetch
  try {
    const response = await fetch("/api/curriculum/catalog.json", {
      headers: { "Cache-Control": "no-cache" },
    });
    if (response.ok) {
      const remoteData: TextbookBook[] = await response.json();
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(remoteData));
          localStorage.setItem(LAST_CHECK_KEY, String(now));
        }
        return {
          catalog: remoteData,
          result: {
            source: "server",
            lastChecked: new Date(now).toLocaleDateString(),
            bookCount: remoteData.length,
            isOnline: true,
            message: "Catalog updated from official curriculum server.",
          },
        };
      }
    }
  } catch {
    // Expected when offline or server route not running locally
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LAST_CHECK_KEY, String(now));
  }
  const current = getActiveCatalog();
  return {
    catalog: current,
    result: {
      source: "bundled",
      lastChecked: new Date(now).toLocaleDateString(),
      bookCount: current.length,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
      message: "Using verified offline bundled NCERT catalog.",
    },
  };
}

/**
 * Filter query parameters for searching books
 */
export interface TextbookQueryParams {
  board?: BoardType | "all";
  grade?: GradeLevel | "all";
  branch?: StreamBranch | "all";
  searchQuery?: string;
}

export function queryBooks(params: TextbookQueryParams): TextbookBook[] {
  const catalog = getActiveCatalog();
  return catalog.filter((book) => {
    if (params.board && params.board !== "all" && book.board !== params.board) {
      return false;
    }
    if (params.grade && params.grade !== "all" && book.grade !== params.grade) {
      return false;
    }
    if (
      params.branch &&
      params.branch !== "all" &&
      book.branch &&
      book.branch !== params.branch &&
      book.branch !== "general"
    ) {
      return false;
    }
    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim().toLowerCase();
      const inTitle = book.title.toLowerCase().includes(q);
      const inHindi = book.hindiTitle?.toLowerCase().includes(q) || false;
      const inSubject = book.subject.toLowerCase().includes(q);
      const inChapters = book.chapters.some(
        (ch) =>
          ch.title.toLowerCase().includes(q) ||
          ch.hindiTitle?.toLowerCase().includes(q) ||
          ch.pdfCode.toLowerCase().includes(q)
      );
      if (!inTitle && !inHindi && !inSubject && !inChapters) {
        return false;
      }
    }
    return true;
  });
}
