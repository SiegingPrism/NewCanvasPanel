export type AppLanguage = "en" | "hi" | "mr";

export interface TranslationDictionary {
  // Navigation & TopBar
  exit: string;
  saveToAccount: string;
  saved: string;
  saving: string;
  offline: string;
  endClass: string;
  paper: string;
  present: string;
  map: string;
  ai: string;
  menu: string;
  untitledBoard: string;

  // Side Dock Tools
  move: string;
  pen: string;
  highlighter: string;
  eraser: string;
  select: string;
  text: string;
  shapes: string;
  more: string;

  // Bottom Controls
  undo: string;
  redo: string;
  clear: string;
  help: string;
  laser: string;
  newPage: string;
  pages: string;
  page: string;

  // Core Features for Indian Classrooms
  docCamera: string;
  docCameraDesc: string;
  lessonReplay: string;
  lessonReplayDesc: string;
  readAloud: string;
  liveCaptions: string;
  liveCaptionsDesc: string;
  freeze: string;
  unfreeze: string;
  addToBoard: string;
  switchCamera: string;
  rotate: string;
  play: string;
  pause: string;
  speed: string;
  restart: string;

  // Language & Settings
  language: string;
  english: string;
  hindi: string;
  marathi: string;
  writeAnywhere: string;
  boardSettings: string;
  clearPageConfirm: string;
  clearAll: string;
  cancel: string;

  // Widgets Sheet Tabs
  tabInsert: string;
  tabTeach: string;
  tabClassroom: string;
  tabStem: string;
  tabAi: string;
}

export const translations: Record<AppLanguage, TranslationDictionary> = {
  en: {
    exit: "Exit",
    saveToAccount: "Save to Account",
    saved: "Saved",
    saving: "Saving...",
    offline: "Offline",
    endClass: "End Class",
    paper: "Paper",
    present: "Present",
    map: "Map",
    ai: "AI",
    menu: "Menu",
    untitledBoard: "Untitled board",

    move: "Move",
    pen: "Pen",
    highlighter: "Highlight",
    eraser: "Eraser",
    select: "Select",
    text: "Text",
    shapes: "Shapes",
    more: "More",

    undo: "Undo",
    redo: "Redo",
    clear: "Clear",
    help: "Help",
    laser: "Laser",
    newPage: "New",
    pages: "Pages",
    page: "Page",

    docCamera: "Document Camera",
    docCameraDesc: "USB visualizer & textbook capture",
    lessonReplay: "Lesson Replay",
    lessonReplayDesc: "Watch lesson being written",
    readAloud: "Read Aloud",
    liveCaptions: "Live Captions",
    liveCaptionsDesc: "Real-time speech to text",
    freeze: "Freeze",
    unfreeze: "Live",
    addToBoard: "Add to Board",
    switchCamera: "Switch Camera",
    rotate: "Rotate",
    play: "Play",
    pause: "Pause",
    speed: "Speed",
    restart: "Restart",

    language: "Language",
    english: "English",
    hindi: "हिन्दी",
    marathi: "मराठी",
    writeAnywhere: "Write anywhere. Tap Help for a tour.",
    boardSettings: "Board Settings",
    clearPageConfirm: "Clear current page?",
    clearAll: "Clear",
    cancel: "Cancel",

    tabInsert: "Insert",
    tabTeach: "Teach",
    tabClassroom: "Classroom",
    tabStem: "Maths & STEM",
    tabAi: "AI & Files",
  },

  hi: {
    exit: "बाहर निकलें",
    saveToAccount: "खाते में सहेजें",
    saved: "सहेजा गया",
    saving: "सहेज रहे हैं...",
    offline: "ऑफ़लाइन",
    endClass: "कक्षा समाप्त",
    paper: "कागज़",
    present: "प्रस्तुत करें",
    map: "मानचित्र",
    ai: "एआई",
    menu: "मेनू",
    untitledBoard: "बिना शीर्षक बोर्ड",

    move: "हिलाएं",
    pen: "पेन",
    highlighter: "हाइलाइट",
    eraser: "इरेज़र",
    select: "चुनें",
    text: "टेक्स्ट",
    shapes: "आकृतियाँ",
    more: "अधिक",

    undo: "पूर्ववत",
    redo: "फिर से करें",
    clear: "साफ़ करें",
    help: "सहायता",
    laser: "लेज़र",
    newPage: "नया",
    pages: "पृष्ठ",
    page: "पृष्ठ",

    docCamera: "दस्तावेज़ कैमरा",
    docCameraDesc: "यूएसबी कैमरा व पुस्तक कैप्चर",
    lessonReplay: "पाठ रीप्ले",
    lessonReplayDesc: "लिखे गए पाठ का रीप्ले देखें",
    readAloud: "बोलकर सुनाएं",
    liveCaptions: "लाइव उपशीर्षक",
    liveCaptionsDesc: "शिक्षक के भाषण से लाइव टेक्स्ट",
    freeze: "फ़्रीज़",
    unfreeze: "लाइव",
    addToBoard: "बोर्ड पर जोड़ें",
    switchCamera: "कैमरा बदलें",
    rotate: "घुमाएं",
    play: "चलाएं",
    pause: "रोकें",
    speed: "गति",
    restart: "पुनः प्रारंभ",

    language: "भाषा",
    english: "English",
    hindi: "हिन्दी",
    marathi: "मराठी",
    writeAnywhere: "कहीं भी लिखें। सहायता के लिए हेल्प दबाएं।",
    boardSettings: "बोर्ड सेटिंग्स",
    clearPageConfirm: "क्या आप इस पृष्ठ को साफ़ करना चाहते हैं?",
    clearAll: "साफ़ करें",
    cancel: "रद्द करें",

    tabInsert: "जोड़ें",
    tabTeach: "पढ़ाएं",
    tabClassroom: "कक्षा",
    tabStem: "गणित व विज्ञान",
    tabAi: "एआई व फ़ाइलें",
  },

  mr: {
    exit: "बाहेर पडा",
    saveToAccount: "खात्यात जतन करा",
    saved: "जतन केले",
    saving: "जतन करत आहे...",
    offline: "ऑफलाइन",
    endClass: "वर्ग समाप्त",
    paper: "कागद",
    present: "सादर करा",
    map: "नकाशा",
    ai: "एआय",
    menu: "मेनू",
    untitledBoard: "शीर्षक नसलेला बोर्ड",

    move: "हलवा",
    pen: "पेन",
    highlighter: "हायलाइट",
    eraser: "खोडरबर",
    select: "निवडा",
    text: "मजकूर",
    shapes: "आकार",
    more: "अधिक",

    undo: "पूर्ववत",
    redo: "पुन्हा करा",
    clear: "साफ करा",
    help: "मदत",
    laser: "लेझर",
    newPage: "नवीन",
    pages: "पृष्ठे",
    page: "पान",

    docCamera: "दस्तऐवज कॅमेरा",
    docCameraDesc: "यूएसबी कॅमेरा आणि पुस्तक कॅप्चर",
    lessonReplay: "धडा रीप्ले",
    lessonReplayDesc: "लिहिलेला धडा पुन्हा पहा",
    readAloud: "मोठ्याने वाचा",
    liveCaptions: "थेट मथळे",
    liveCaptionsDesc: "शिक्षकांच्या आवाजाचे थेट मजकूरात रूपांतर",
    freeze: "फ्रीज",
    unfreeze: "थेट",
    addToBoard: "बोर्डवर जोडा",
    switchCamera: "कॅमेरा बदला",
    rotate: "फिरवा",
    play: "चालवा",
    pause: "थांबवा",
    speed: "गती",
    restart: "पुन्हा सुरू करा",

    language: "भाषा",
    english: "English",
    hindi: "हिन्दी",
    marathi: "मराठी",
    writeAnywhere: "कुठेही लिहा. मदतीसाठी हेल्प दाबा.",
    boardSettings: "बोर्ड सेटिंग्ज",
    clearPageConfirm: "वर्तमान पृष्ठ साफ करायचे का?",
    clearAll: "साफ करा",
    cancel: "रद्द करा",

    tabInsert: "जोडा",
    tabTeach: "शिकवा",
    tabClassroom: "वर्ग",
    tabStem: "गणित व विज्ञान",
    tabAi: "एआय आणि फायली",
  },
};
