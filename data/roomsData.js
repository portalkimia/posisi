/**
 * TKA 2026 - Room Layouts, Schedules & Student Rosters
 * Static metadata compiled directly from the official seating plans.
 */

const TKA_DATES = [
  { id: "2026-10-26", label: "26 Okt", sheetName: "Rekap_26_Okt", dayName: "Hari 1 (Senin)" },
  { id: "2026-10-27", label: "27 Okt", sheetName: "Rekap_27_Okt", dayName: "Hari 2 (Selasa)" },
  { id: "2026-10-28", label: "28 Okt", sheetName: "Rekap_28_Okt", dayName: "Hari 3 (Rabu)" },
  { id: "2026-10-29", label: "29 Okt", sheetName: "Rekap_29_Okt", dayName: "Hari 4 (Kamis)" }
];

const ROOMS_DATA = {
  "Ruang 1": {
    name: "Ruang 1",
    totalDesks: 22,
    sessions: ["Sesi 1", "Sesi 2", "Sesi 3"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20],
      [null, 21, null, 22, null]
    ],
    roster: {
      1: { sesi1: "Achmad Rafie Kurniawan", sesi2: "Nadhirah Veli Athifah", sesi3: "Muhammad Zulfikar Athoillah" },
      2: { sesi1: "Baynardh Damara Iskandar", sesi2: "Nasyifa Azzahra Abriani", sesi3: "Muhammad Jibril Abdillah" },
      3: { sesi1: "Farras Riziq Yafi", sesi2: "Isna Najwa Sofia", sesi3: "Aditya Maulana Farhandika" },
      4: { sesi1: "Ahmad Nafisun Nufus", sesi2: "Clara Nidha Maura", sesi3: "Mochammad Habibur Rohman" },
      5: { sesi1: "Farrel Isnanda Bakti", sesi2: "Keisha Dzakiyyah Sakhi", sesi3: "Tristan Alfiansyah Putra" },
      6: { sesi1: "Fathir Arif El Jauza", sesi2: "Marchelline Sarimoynalli Ng", sesi3: "Muchammad Wildan Habibi" },
      7: { sesi1: "Fadel Muhammad Ibrahim Fachruroji", sesi2: "Afifah Nadif Fitria", sesi3: "Nizar Alfiansyah" },
      8: { sesi1: "Abdul Hafidz Al Anshory", sesi2: "Aaliyah Bakhita Rizqi", sesi3: "Harfi Putra Rosyadi" },
      9: { sesi1: "Muhammad Daniswara Kenzie", sesi2: "Dhiyaulhaq Kurnia Ahmad", sesi3: "Muhammad Alif Usamah Aslam" },
      10: { sesi1: "Alif Adetiyah Aliansah", sesi2: "Nada Fasyihatun Nafisya", sesi3: "Kerubim Akhbar Perwira Elloi" },
      11: { sesi1: "Muhammad Rafi Aldiansyah", sesi2: "Faizah Fadhilatur Rokhmah", sesi3: "Muhammad Dwi Pranaya" },
      12: { sesi1: "M. Kelvin Ainun Nurul Pratama", sesi2: "Ainaya Eka Febriana", sesi3: "Muhammad Zuhri" },
      13: { sesi1: "Ahmad Syahrizal Rusliyanto", sesi2: "Nadia Assyifa", sesi3: "Ferdy Nugroho" },
      14: { sesi1: "Aflah Kenzie Nur Iskandar", sesi2: "Dania", sesi3: "M. Daffa' Al Faruq" },
      15: { sesi1: "Muhammad Hilal Wibowo", sesi2: "Nur Alfina Mafaza Alwi", sesi3: "Muhammad Ardhan Al Ghozali" },
      16: { sesi1: "Kevin Rahiza Rahman", sesi2: "Aqilah Al-Azmi", sesi3: "Moh. Syaifudin Ali" },
      17: { sesi1: "Muhammad Akhdan Zhafif", sesi2: "", sesi3: "Ghazi Ahmad Maureno" },
      18: { sesi1: "Elang Raditya Syahdan", sesi2: "", sesi3: "Muhammad Syabil An Nafis" },
      19: { sesi1: "Muhammad Edgar Hidayatullah", sesi2: "", sesi3: "M. Fitrah Raditya Ramadhan" },
      20: { sesi1: "Mohammad Naufal Afriansyah", sesi2: "", sesi3: "Muhammad Awaludin Ramadhan" },
      21: { sesi1: "Muhammad Iqbal Farabi", sesi2: "", sesi3: "Rayhan Surya Gunawan" },
      22: { sesi1: "", sesi2: "", sesi3: "Habibi Rif`At Al Ghifari" }
    }
  },

  "Ruang 2": {
    name: "Ruang 2",
    totalDesks: 22,
    sessions: ["Sesi 1", "Sesi 2", "Sesi 3"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20],
      [null, 21, null, 22, null]
    ],
    roster: {
      1: { sesi1: "Hafid Adar Khutni", sesi2: "Hanum Natasya Putri", sesi3: "Muhammad Aryasatya Nur Suwardana" },
      2: { sesi1: "Admirald Alvin Firdaus", sesi2: "Firsty Salsabila Zaafarani", sesi3: "Khoirul Raditya Pratama" },
      3: { sesi1: "Rayyan Zayyani Gunawan", sesi2: "Aisya Rizky Alifia", sesi3: "Achmad Nur Fauzi" },
      4: { sesi1: "Muhammad Rahlil Ibrahim", sesi2: "Annisa Salsabila Usman", sesi3: "Arshavin Radja Hasibuan" },
      5: { sesi1: "Ahmad Muhlas Nasrudin", sesi2: "Aura Feiyaz Musyafak", sesi3: "Muhammad Javier Zayyanrayo" },
      6: { sesi1: "Ontowiryo Cantona Prayogo", sesi2: "Callysta Elysia Supit", sesi3: "Muhammad Bayu Arizki" },
      7: { sesi1: "Rahmat Syabandy", sesi2: "Gavrila Ashila Azka", sesi3: "Shila Ayudya Silvani" },
      8: { sesi1: "Arja Fery Achmad", sesi2: "Anisa Fitriani Suryanto", sesi3: "Shireen Calista Zahra" },
      9: { sesi1: "Achmad Emir Rayyan Hakim", sesi2: "Shabrina Marwah Munajati", sesi3: "Alamanda Yuniar" },
      10: { sesi1: "Fadlan Al Firdaus", sesi2: "Putri Dea Alamanda", sesi3: "Aridia Pengantin" },
      11: { sesi1: "Muhammad Shiffan Barik Bil Haq", sesi2: "Tsaniyah Inaz Salsabila", sesi3: "Syafrida Anatasyah Azzahra" },
      12: { sesi1: "Fernando Rafa Nur Rosyidan", sesi2: "Afidah Ratri Murprianggono", sesi3: "Wisda Aisyah Fatmawati" },
      13: { sesi1: "Ahmad Hanif Shahal", sesi2: "Rahma Attaya Syakira", sesi3: "Vanessa Eka Salsabila" },
      14: { sesi1: "Dhafi Azkya Syafiulqolby", sesi2: "Silvana Antika", sesi3: "Eka Maulidiyah Purbasari" },
      15: { sesi1: "Achmad Habiby Qalby Syahroni", sesi2: "Adinda Putri Zabilla", sesi3: "Eccha Augustiara Yudiananda" },
      16: { sesi1: "Achmad Wildan Raihan Azizi", sesi2: "Rana Berliana", sesi3: "Megatha Pringgan Sidayu" },
      17: { sesi1: "Maulana Rumi Al Aqsa", sesi2: "", sesi3: "Neysha Inna Anna Amanah" },
      18: { sesi1: "Mochammad Nazril Abdullah", sesi2: "", sesi3: "Adinda Nazwa Ramandany" },
      19: { sesi1: "M.Bili Bilhaq", sesi2: "", sesi3: "Elsya Nur Afellia Putri" },
      20: { sesi1: "Ilzam Azka Salam", sesi2: "", sesi3: "Nadhira Khanza Ramadhani" },
      21: { sesi1: "", sesi2: "", sesi3: "Chika Attakayla Putri" },
      22: { sesi1: "", sesi2: "", sesi3: "Lidya Andini Nurrahma" }
    }
  },

  "Ruang 3": {
    name: "Ruang 3",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2", "Sesi 3"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Rizqi Irsyad Ibrahim", sesi2: "Nadya Nova Salsabila", sesi3: "Nadyatul Zahirah" },
      2: { sesi1: "Muchammad Nauval Syaukaniansyah", sesi2: "Rahmah Maulidiyah", sesi3: "Dewi Sayyidati Nafisatus Sholikha" },
      3: { sesi1: "Muhammad Aflah Zarir Arkan", sesi2: "Wa Ode Insan Nur Kamila", sesi3: "Andrea Rizky Octavia" },
      4: { sesi1: "Rizqy Pratama Fatchuly", sesi2: "Aimmaturrafti", sesi3: "Audy Ayu Cinta Dinova" },
      5: { sesi1: "M. Abd. Aziz Manshur", sesi2: "Nadine Alya Nabila", sesi3: "Afidatus Sa'adah" },
      6: { sesi1: "Muhammad Raffi Rachman", sesi2: "Salwa Salsabila Rahmah", sesi3: "Aprytha Nazmi Nur Kamilla" },
      7: { sesi1: "Razan Kamil Alfarey", sesi2: "Keisha Nabilah Azmi", sesi3: "Ariqah Indah Setyawati" },
      8: { sesi1: "Muhammad Ali Zuhair Mushthofa", sesi2: "Syahda Rania Larasati", sesi3: "Naya Adelia Wiharjo" },
      9: { sesi1: "Muhammad Bilal", sesi2: "Aini Nadia Affi", sesi3: "Dini Hidayati" },
      10: { sesi1: "Muhammad Rum Hijaz Rahmat", sesi2: "Nadine Aulia Ramadhani", sesi3: "Farah Layla Ramadhani" },
      11: { sesi1: "Rozan Al Buchory", sesi2: "Putri Ayu El Jailani", sesi3: "Ulya Dwi Assyafa" },
      12: { sesi1: "Ahmad Zahrul Azhar Abyan", sesi2: "Rachellavish Al Jauharoh", sesi3: "Erlynda Dwi Yudhini" },
      13: { sesi1: "Abdul Hamid", sesi2: "Maulida Salma Salsabila", sesi3: "Sovia Dwi Ramadhani" },
      14: { sesi1: "Arya Pramana Ramadhan", sesi2: "Ainur Safraa' Difa Kaiyisah", sesi3: "Inka Selvi Rahayu" },
      15: { sesi1: "Achmad Raykhan Adhi Putra", sesi2: "Ummu Umarah Azra Azzahra", sesi3: "Siti Mufadhilatur Rohmah" },
      16: { sesi1: "Azrul Muhammad El Hafidz", sesi2: "Rayhana Dhevi Tiaranita", sesi3: "Alina Firdausi Mustofa" },
      17: { sesi1: "Andi Wira Seno Hardiawan", sesi2: "", sesi3: "Zahratus Syifa Afanin" },
      18: { sesi1: "Athallah Farras Annizar", sesi2: "", sesi3: "Siti Raudlatul Jannah" },
      19: { sesi1: "Aqsho Ramadhan", sesi2: "", sesi3: "Novy Rachma Nia" },
      20: { sesi1: "Devandra Tristan Mirza", sesi2: "", sesi3: "Mellani Risty Olivia" }
    }
  },

  "Ruang 4": {
    name: "Ruang 4",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Nur Achmad Hafiz Rozaqy", sesi2: "Nadya Puspa Arisandi", sesi3: "" },
      2: { sesi1: "Muhammad Nazriel Faturrahman", sesi2: "Neiska Hawa Sabrinadiza", sesi3: "" },
      3: { sesi1: "Habiburrahman El Sirazi", sesi2: "Naila Emira Nafisah", sesi3: "" },
      4: { sesi1: "Hafiz Setya Wardhana", sesi2: "Naura Putri Masywazzahro", sesi3: "" },
      5: { sesi1: "Muhammad Farras Haidar Al Hasyimy", sesi2: "Azkiya Zhahira", sesi3: "" },
      6: { sesi1: "Fakhri Adnan Daffa", sesi2: "Mahardika Bintari Putri Pratama Saifudin", sesi3: "" },
      7: { sesi1: "Muhammad Averroes Lukman Masdarah", sesi2: "Dini Rahmani Salsabillah", sesi3: "" },
      8: { sesi1: "M Rifqiy Satria Bachtiar", sesi2: "Marsha Tafrihatul Fuadia", sesi3: "" },
      9: { sesi1: "Drestra Ardhana Alfarizqi", sesi2: "Clarissa Nadya Amiroh", sesi3: "" },
      10: { sesi1: "Muhammad Fatih Zaky", sesi2: "Keishaling Cinta Afandy", sesi3: "" },
      11: { sesi1: "Mocha Zulfa Rabbani", sesi2: "Melfy Surya Satrio", sesi3: "" },
      12: { sesi1: "M. Haikal Syarif", sesi2: "Alberta Elysia Ramadanti", sesi3: "" },
      13: { sesi1: "Muchammad Izzur Fauzil Adhim", sesi2: "Anindya Faradit Az Zahra", sesi3: "" },
      14: { sesi1: "Muhammad Fauzan Akmal", sesi2: "Devina Alya Ramadhania", sesi3: "" },
      15: { sesi1: "Sakhi Janma Aqila", sesi2: "Dahayu Na'ilah Putri", sesi3: "" },
      16: { sesi1: "Mohammad Fatiyan Akbar", sesi2: "Kirana Putri Bilqis", sesi3: "" },
      17: { sesi1: "Muhammad Izyan Adly Absyari", sesi2: "", sesi3: "" },
      18: { sesi1: "Muhammad Aflah Rabbany Ainuzzaki", sesi2: "", sesi3: "" },
      19: { sesi1: "Rakha Hadyan Wicaksono", sesi2: "", sesi3: "" },
      20: { sesi1: "Hafidh Wahyu Robbani", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 5": {
    name: "Ruang 5",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Ahmad Maulana Abdillah", sesi2: "Talitha Estiningtyas", sesi3: "" },
      2: { sesi1: "Sastra Jendra Cindikiawan", sesi2: "Flaurina Shifani Indah Nur Muslim", sesi3: "" },
      3: { sesi1: "Azriel Nizar Ferdinand", sesi2: "Niswa Madinatul Munawaroh", sesi3: "" },
      4: { sesi1: "Vinno Arsyad Adianto", sesi2: "Vagyta Dwi Fiana", sesi3: "" },
      5: { sesi1: "Fabian Ibrahim Nabawi", sesi2: "Utita Fadhla Achmad", sesi3: "" },
      6: { sesi1: "Muhammad Galang Satria Yudhistira", sesi2: "Shabrina Jannatiya Mahrus", sesi3: "" },
      7: { sesi1: "Mohamad Elbano Rafsanjani", sesi2: "Zyvana Febriani Widiantoro", sesi3: "" },
      8: { sesi1: "Adam Athaillah Asyrafin Pambudi", sesi2: "Gelsi Sabiha Arifianto", sesi3: "" },
      9: { sesi1: "Hanif Ahmad Fakhrozi", sesi2: "Raysya Noviandari", sesi3: "" },
      10: { sesi1: "Sergio Alfari Harabity", sesi2: "Afifah Zhafirah Viari Bhakti", sesi3: "" },
      11: { sesi1: "Waffi Argani Althaf", sesi2: "Annisa Fitri Hendriyanti", sesi3: "" },
      12: { sesi1: "Nabil Zulfahmi Al Hafizh", sesi2: "Alifa Nayla Husnul Syafira", sesi3: "" },
      13: { sesi1: "Satria Anom Putra Akhiyar", sesi2: "Eiliyah Farzana Hardian", sesi3: "" },
      14: { sesi1: "Achmad Rafi' Rabbani", sesi2: "Aliya Azariah", sesi3: "" },
      15: { sesi1: "Izzan Fadilah Murkon Harahap", sesi2: "Alya Rayhana Hamidah", sesi3: "" },
      16: { sesi1: "Raisya Azham Praniandaka", sesi2: "Yashinta Hayuningtyas Sutrisno", sesi3: "" },
      17: { sesi1: "Zunnun Asif Ibratan", sesi2: "", sesi3: "" },
      18: { sesi1: "Rafiq Wahab Sugiharto", sesi2: "", sesi3: "" },
      19: { sesi1: "Rizky Fathoni Fajar Rahman", sesi2: "", sesi3: "" },
      20: { sesi1: "Nafinza Athaillah Ramadhan", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 6": {
    name: "Ruang 6",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Azmi Azril Abdillah", sesi2: "Jihan Zahranie Hamid", sesi3: "" },
      2: { sesi1: "Hendra Dwi Candra Winata", sesi2: "Sasi Kirana Rahmadhani", sesi3: "" },
      3: { sesi1: "Moh. Rafi Syaifullah", sesi2: "Jihan Ramadhani", sesi3: "" },
      4: { sesi1: "Al Fachri Bimantara", sesi2: "Quin Wilis", sesi3: "" },
      5: { sesi1: "Mohammad Ezzra Miqdad", sesi2: "Haura Adeline", sesi3: "" },
      6: { sesi1: "Caesar Izzulhaq Zulfikar", sesi2: "Najwa Faakhirah", sesi3: "" },
      7: { sesi1: "Mafreyno Yusuf Dzaki Wicaksana", sesi2: "Na'ilah Rake Lokapala Kurniawan", sesi3: "" },
      8: { sesi1: "Mohammad Afgan Fahreisya", sesi2: "Mutiara Janeeta Lituhayu", sesi3: "" },
      9: { sesi1: "Mochamad Rizky Nata Adjie", sesi2: "Raden Ajeng Shabrinah Al Aqilah", sesi3: "" },
      10: { sesi1: "M. Riffat Arkana Sandi", sesi2: "Maritza Furichah Alifatus Sholichah", sesi3: "" },
      11: { sesi1: "Karendra Rizky Athailah", sesi2: "Nuril Mayada Fajrin", sesi3: "" },
      12: { sesi1: "Diandra Wisanggeni Putra Permadie", sesi2: "Naimatus Syakira", sesi3: "" },
      13: { sesi1: "Bisma Anjaya Akbar", sesi2: "Nisrina Salma Anggraini", sesi3: "" },
      14: { sesi1: "Mochammad Audrey Attaya", sesi2: "Queentha Nadila El Haq", sesi3: "" },
      15: { sesi1: "Akhmad Jilan Farel Eleazar", sesi2: "Hadayta Na'ma Machsan", sesi3: "" },
      16: { sesi1: "Alif Pradipta Utama", sesi2: "Najwa Nuur Faricha", sesi3: "" },
      17: { sesi1: "Akmal Hilal Abiyyu Sahih", sesi2: "", sesi3: "" },
      18: { sesi1: "Khoirusshabri Muazzam Asyraf", sesi2: "", sesi3: "" },
      19: { sesi1: "Bayu Pratama Putra", sesi2: "", sesi3: "" },
      20: { sesi1: "Hilmi Wibowo Hadi", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 7": {
    name: "Ruang 7",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Muhammad Zulfan Maladzi", sesi2: "Sunny Alfiyah Rihhadatul'aisya", sesi3: "" },
      2: { sesi1: "Muhammad Zulfan Fakhrudin", sesi2: "Zahrah Azkania Rahmah", sesi3: "" },
      3: { sesi1: "Reyvan Arif Alwani", sesi2: "Anisa Nur Zakiah", sesi3: "" },
      4: { sesi1: "Muhammad Miftakhurrohman Hidayatulloh", sesi2: "Asilah Nur Rahmah", sesi3: "" },
      5: { sesi1: "Akhmad Daffa Mourinho Putra Fakhrizal", sesi2: "Farah Nabila Ayudia", sesi3: "" },
      6: { sesi1: "Hanif As Sauky Basyir", sesi2: "Alya Raniah Zahra", sesi3: "" },
      7: { sesi1: "Abi Nendra Bayu Santoso", sesi2: "Bintang Nova Aquila Al Azizah", sesi3: "" },
      8: { sesi1: "Almer Muhammad Al Ghani", sesi2: "Anindita Aisha", sesi3: "" },
      9: { sesi1: "Bintang Dava Muhtarom", sesi2: "Eka Putri Hardiyanti", sesi3: "" },
      10: { sesi1: "Dhevan Almer Rafi Rabbani Hartadi", sesi2: "Cadereyn Sanchia Nathaniela", sesi3: "" },
      11: { sesi1: "Fadhil Achmad Al Ashari", sesi2: "Anissa Amalia Putri", sesi3: "" },
      12: { sesi1: "Burhanuddin Yusuf", sesi2: "Farras Qoratu'ain Bangun", sesi3: "" },
      13: { sesi1: "Abdullah Al Hafidz", sesi2: "Azhara Ramadhan Fitriani", sesi3: "" },
      14: { sesi1: "Muhammad Wildan Multazam", sesi2: "Aurellia Adinata", sesi3: "" },
      15: { sesi1: "Muhammad Arfad Robbani", sesi2: "Elmeira Hanifiyah Samhah", sesi3: "" },
      16: { sesi1: "Syabib Rabbani", sesi2: "Karina Kasih Almas", sesi3: "" },
      17: { sesi1: "Muhammad Azmi Alifi As Shaffa", sesi2: "", sesi3: "" },
      18: { sesi1: "Muhammad Akmal Al Khalid", sesi2: "", sesi3: "" },
      19: { sesi1: "Muhammad Aditya", sesi2: "", sesi3: "" },
      20: { sesi1: "Muhamad Ar Royyan Alfaridzi Hermawan", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 8": {
    name: "Ruang 8",
    totalDesks: 21,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [6, 5, 4, 3, 2, 1],
      [null, 7, 8, 9, 10, 11],
      [null, 16, 15, 14, 13, 12],
      [null, 17, 18, 19, 20, 21]
    ],
    roster: {
      1: { sesi1: "Mohamad Evron Pratama Yudha", sesi2: "Maritza Wanda Aurelia", sesi3: "" },
      2: { sesi1: "Mochamad Lachlan Daffa Kumara", sesi2: "Salsabillah Putri Hariyanto", sesi3: "" },
      3: { sesi1: "Rahmad Nanda Djanuartha", sesi2: "Syafira Azzahra Khairunnisa", sesi3: "" },
      4: { sesi1: "Wildan Fadel Maulana", sesi2: "Naurah Zayyani Jauhari", sesi3: "" },
      5: { sesi1: "Mukhammad Qolbi Shubara", sesi2: "Mazaya Dalili Fahimah", sesi3: "" },
      6: { sesi1: "M. Zaydan Firras Balthazar", sesi2: "Medina Az Zahra", sesi3: "" },
      7: { sesi1: "Muhammad Taqiyuddin Hibban", sesi2: "Najla Amiroh", sesi3: "" },
      8: { sesi1: "Rasya Da'il Makruf", sesi2: "Zakia Naura Sholihah", sesi3: "" },
      9: { sesi1: "Muhammad Aniq Nadhor", sesi2: "Nailatur Rohmah", sesi3: "" },
      10: { sesi1: "Muhammad Angga Dzarrin Al Ghifari", sesi2: "Khanza Nisrina Yusman", sesi3: "" },
      11: { sesi1: "Sovann Gani Wiranata", sesi2: "Zahira Asy Syifa Ramadhani", sesi3: "" },
      12: { sesi1: "Muhammad Akmal Na'il", sesi2: "Shafira Cahya Elvaretta Putri", sesi3: "" },
      13: { sesi1: "Lalu Yasyfi Fadhli Anrabbi", sesi2: "Istikhomah Ainul Ma'arifiani", sesi3: "" },
      14: { sesi1: "Muhammad Abiyu Maulidda", sesi2: "Azzahra Bilqis Faiza", sesi3: "" },
      15: { sesi1: "Muhammad Zizou Ar Rayyan", sesi2: "Aliya Apdany Putri Dafadillah", sesi3: "" },
      16: { sesi1: "Muhammad Al-Fatih", sesi2: "Andina Shofi Maritza", sesi3: "" },
      17: { sesi1: "Muhammad Harfi Islami", sesi2: "", sesi3: "" },
      18: { sesi1: "Muhammad Fahreza Wildan Muflihun", sesi2: "", sesi3: "" },
      19: { sesi1: "Wildan Faizal Zaki", sesi2: "", sesi3: "" },
      20: { sesi1: "Naufal Allaam Ar Rosyadi", sesi2: "", sesi3: "" },
      21: { sesi1: "Muhammad Akmal Ubaidillah", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 9": {
    name: "Ruang 9",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Ezzar Wahyu Subekti", sesi2: "Alzena Putri Atresia", sesi3: "" },
      2: { sesi1: "Hasan Abdullah Faqih", sesi2: "Aisha Nurul Azizah", sesi3: "" },
      3: { sesi1: "Daris Ammar Subagyo", sesi2: "Almirah Syahda Mughni Prayitno", sesi3: "" },
      4: { sesi1: "Luqman Hakim Al-Hamdi", sesi2: "Adinda Aakilah Ambarah", sesi3: "" },
      5: { sesi1: "Zennin Muhammad Laiq Arka", sesi2: "Razika Ahda Farahiyah", sesi3: "" },
      6: { sesi1: "M Anas Addar Quthni Irza", sesi2: "Jahanara Mumtaz Mahal", sesi3: "" },
      7: { sesi1: "Muhammad Ilham Baihaqi", sesi2: "Mafaza Nailul Istibsyaroh Fauzi", sesi3: "" },
      8: { sesi1: "Muhammad Utsman Ishaqi", sesi2: "Khairunnisa Salsabila Yusuf", sesi3: "" },
      9: { sesi1: "Muh. Raihan Annafis", sesi2: "Nabilah Myiesha Nafeeza Ayu", sesi3: "" },
      10: { sesi1: "Evan Raditya Permana", sesi2: "Naurina Marsya Nadzifah", sesi3: "" },
      11: { sesi1: "Ahmad Farhan Faiq Azizi", sesi2: "Naquita Calvinna Hafizhah", sesi3: "" },
      12: { sesi1: "Elang Bintang Kriswanto", sesi2: "Syaliana Shokhibatul Mukarromah", sesi3: "" },
      13: { sesi1: "Mohammad Rakha Rabbani", sesi2: "Nadia Cahyani Syifaiyah", sesi3: "" },
      14: { sesi1: "Dante Hibrizy Mustofa", sesi2: "Aisha Dzakira Qurratu'ain", sesi3: "" },
      15: { sesi1: "M. A. Hasan Basri", sesi2: "Navira Ramadhani", sesi3: "" },
      16: { sesi1: "M. Daffa Khaidar Arifin", sesi2: "Qorrie Aena Rosyidi", sesi3: "" },
      17: { sesi1: "Muhammad Mahrus Ali Ramadhan", sesi2: "", sesi3: "" },
      18: { sesi1: "Muhammad Hafizh Akmal Ghozi", sesi2: "", sesi3: "" },
      19: { sesi1: "Ervannio Elfan Syahputra", sesi2: "", sesi3: "" },
      20: { sesi1: "", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 10": {
    name: "Ruang 10",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Muhammad Reyhan Al Farrell", sesi2: "Hanuun Avrelia Deby", sesi3: "" },
      2: { sesi1: "Rafi Rahadian Saladin", sesi2: "Callula Bahy Putri Hardiyanto", sesi3: "" },
      3: { sesi1: "Rayhan Arkananta", sesi2: "Azkanura Najwa Mufida", sesi3: "" },
      4: { sesi1: "Keynan Rafif Aydin Azzam", sesi2: "Anisa Pranestya Marton", sesi3: "" },
      5: { sesi1: "Fathan Rafa Ghazwan", sesi2: "Hasna Amalia Usmani", sesi3: "" },
      6: { sesi1: "Giovanni Rafa Alfarisi", sesi2: "Nafisa Aulia Lu'lu'ul Jannah", sesi3: "" },
      7: { sesi1: "Muhammad Syakif Fadysrach Al Rahman", sesi2: "Fanny Hilmiya Dzakiyyah", sesi3: "" },
      8: { sesi1: "Faith Azmi Athallah", sesi2: "Athiyatul Maula Mumtazah", sesi3: "" },
      9: { sesi1: "Muhammad Rafif Karimul Haq", sesi2: "Cindy Haudhea Azzahra", sesi3: "" },
      10: { sesi1: "Kemal Atha Ar Rasheed", sesi2: "Aulia Callysta Qurrotuaini Ronovskly", sesi3: "" },
      11: { sesi1: "Muhammad Faqih Fathurrabbani", sesi2: "Erliana Fadhila Aurellia Wijaya", sesi3: "" },
      12: { sesi1: "Akbar Sultan Putra Winarto", sesi2: "Nur Sofia Rachma", sesi3: "" },
      13: { sesi1: "Ahmad Kamil Thabibi", sesi2: "Ivani Agi Khumaira", sesi3: "" },
      14: { sesi1: "Moch. Abiezar Rafif Jatmika", sesi2: "Kamila Quinn", sesi3: "" },
      15: { sesi1: "Muhammad Haifan Haitami Mahfudz", sesi2: "Nasyirah", sesi3: "" },
      16: { sesi1: "Aditya Putra Idham", sesi2: "Nabila Mufarrokhatul Husna", sesi3: "" },
      17: { sesi1: "Tristan Nandana Khoiruman", sesi2: "", sesi3: "" },
      18: { sesi1: "Muhammad Rafif Rafsya Al Izza", sesi2: "", sesi3: "" },
      19: { sesi1: "Ahmad Syauqie Ramadlan", sesi2: "", sesi3: "" },
      20: { sesi1: "Rafi Zaidan Listiyano", sesi2: "", sesi3: "" }
    }
  },

  "Ruang 11": {
    name: "Ruang 11",
    totalDesks: 20,
    sessions: ["Sesi 1", "Sesi 2"],
    grid: [
      [5, 4, 3, 2, 1],
      [6, 7, 8, 9, 10],
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20]
    ],
    roster: {
      1: { sesi1: "Ahmad Farrel Avriansyah", sesi2: "Aisyah Nurul Izzah", sesi3: "" },
      2: { sesi1: "Ahmad Iqbal Farabi Adnan", sesi2: "Rayya At Tamam", sesi3: "" },
      3: { sesi1: "Afriansyah Maulana Chusni", sesi2: "Arum Awaludini Ishtar Asy Syifa", sesi3: "" },
      4: { sesi1: "Kenzie Syifa Kunto Wibowo", sesi2: "Huriya Hafiza Erilasyah", sesi3: "" },
      5: { sesi1: "Naufal Arzaq", sesi2: "Salsabilla Kholidiya Kusumawardhani", sesi3: "" },
      6: { sesi1: "Rakhasatrya Zidane Arian", sesi2: "Ahira Najwa Nur Hidayat", sesi3: "" },
      7: { sesi1: "Muhammad Sayyaf Al Farisi", sesi2: "Raihanah Aurelia Rahardjo", sesi3: "" },
      8: { sesi1: "Ganesha Axl Fersalley", sesi2: "Isabala Waliyyulloh", sesi3: "" },
      9: { sesi1: "Raihan Ikmal Dayu Mulyana", sesi2: "Nabila Aira Qonita", sesi3: "" },
      10: { sesi1: "Hauna Ittasaqa Rumara", sesi2: "Aisyah Liya Zafirah", sesi3: "" },
      11: { sesi1: "Jibril Burhanuddin At Tauhid", sesi2: "R.A. Medina Cyra El Muna", sesi3: "" },
      12: { sesi1: "Muhammad Nailurrohman", sesi2: "Jasmine Fadia Idzni", sesi3: "" },
      13: { sesi1: "Muhammad Adam Al Muzakki Ghufron", sesi2: "Syakira Halimah Khairunnisa", sesi3: "" },
      14: { sesi1: "M. Fakhri Makinun Amin", sesi2: "Sabrina Izzati Ghanditya", sesi3: "" },
      15: { sesi1: "Abigail Jibril Nayarana", sesi2: "Rumaisha Zahira Izzati", sesi3: "" },
      16: { sesi1: "Fathy Faris", sesi2: "Sabian Finera Waluyo Putri", sesi3: "" },
      17: { sesi1: "Rayhan Baihaqi Wibisono", sesi2: "", sesi3: "" },
      18: { sesi1: "Yazid Fadly", sesi2: "", sesi3: "" },
      19: { sesi1: "Firdaus Haryo Mukti", sesi2: "", sesi3: "" },
      20: { sesi1: "Royan Multaqo", sesi2: "", sesi3: "" }
    }
  },

  "Ruang Guru": {
    name: "Ruang Guru",
    totalDesks: 0,
    isBackupCenter: true,
    description: "Posko Pusat Cadangan Laptop & Perlengkapan Sekolah",
    sessions: ["Sesi 1", "Sesi 2", "Sesi 3"],
    grid: [],
    roster: {}
  }
};

/**
 * Metadata Peserta & Rekap Laptop Siswa
 * Diambil langsung dari sampel data riil pengawas
 */
const KNOWN_STUDENTS_META = {
  "Abdul Hafidz Al Anshory": { nis: "24110061", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Achmad Rafie Kurniawan": { nis: "24110099", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Aflah Kenzie Nur Iskandar": { nis: "24110227", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Ahmad Nafisun Nufus": { nis: "24110076", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Ahmad Syahrizal Rusliyanto": { nis: "24110159", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Alif Adetiyah Aliansah": { nis: "24110144", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Baynardh Damara Iskandar": { nis: "24110094", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: false, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Elang Raditya Syahdan": { nis: "24110190", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "TIDAK ADA", laptop: "AMAN", keterangan: "Charger tertinggal di rumah" },
  "Fadel Muhammad Ibrahim Fachruroji": { nis: "24110013", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Farrel Isnanda Bakti": { nis: "24110217", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Fathir Arif El Jauza": { nis: "24110243", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Kevin Rahiza Rahman": { nis: "24110238", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "M. Kelvin Ainun Nurul Pratama": { nis: "24110128", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Mohammad Naufal Afriansyah": { nis: "24110203", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Akhdan Zhafif": { nis: "24110073", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: false, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Daniswara Kenzie": { nis: "24110082", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Edgar Hidayatullah": { nis: "24110040", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Hilal Wibowo": { nis: "24110025", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Iqbal Farabi": { nis: "24110232", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Muhammad Rafi Aldiansyah": { nis: "24110117", kelas: "XII A1", ruangKelas: "R1", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "" },
  "Ahmad Farrel Avriansyah": { nis: "24110016", kelas: "XII IUPP 2", ruangKelas: "R11", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "Laptop siswa R11 berada di R1" },
  "Firdaus Haryo Mukti": { nis: "24110102", kelas: "XII IUPP 2", ruangKelas: "R11", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "Laptop siswa R11 berada di R1" },
  "Jibril Burhanuddin At Tauhid": { nis: "24110131", kelas: "XII IUPP 2", ruangKelas: "R11", ruangLaptop: "R1", keberadaan: true, charger: "ADA", laptop: "AMAN", keterangan: "Laptop siswa R11 berada di R1" }
};

/**
 * Generate Rekap Laptop Siswa Master Dataset (dengan kolom Sesi 1, Sesi 2, Sesi 3)
 */
function generateMasterRekapList() {
  const list = [];
  let nisCounter = 24110300;

  const kelasOptions = ["XII A1", "XII A2", "XII A3", "XII A4", "XII IUPP 1", "XII IUPP 2", "XII S1", "XII S2"];

  Object.keys(ROOMS_DATA).forEach((roomName) => {
    if (roomName === "Ruang Guru") return;
    const rCode = roomName.replace("Ruang ", "R");
    const conf = ROOMS_DATA[roomName];

    for (let deskNo = 1; deskNo <= conf.totalDesks; deskNo++) {
      const roster = conf.roster[deskNo];
      if (!roster) continue;

      // Unique student names across sessions for this desk
      const studentMap = {};
      ["sesi1", "sesi2", "sesi3"].forEach((sKey, sIdx) => {
        const studentName = roster[sKey];
        if (!studentName || !studentName.trim()) return;
        studentMap[studentName] = sIdx + 1;
      });

      Object.keys(studentMap).forEach((studentName) => {
        const primarySession = studentMap[studentName];
        const known = KNOWN_STUDENTS_META[studentName];
        const deskText = "Meja " + deskNo;

        if (known) {
          list.push({
            nis: known.nis,
            nama: studentName,
            kelas: known.kelas,
            ruangKelas: known.ruangKelas,
            ruangLaptop: known.ruangLaptop,
            sesi1: primarySession === 1 ? deskText : "-",
            sesi2: primarySession <= 2 ? deskText : "-",
            sesi3: deskText,
            keberadaan: known.keberadaan,
            charger: known.charger,
            laptop: known.laptop,
            keterangan: known.keterangan
          });
        } else {
          nisCounter++;
          const defaultKelas = kelasOptions[(deskNo + primarySession) % kelasOptions.length];
          list.push({
            nis: String(nisCounter),
            nama: studentName,
            kelas: defaultKelas,
            ruangKelas: rCode,
            ruangLaptop: rCode,
            sesi1: primarySession === 1 ? deskText : "-",
            sesi2: primarySession <= 2 ? deskText : "-",
            sesi3: deskText,
            keberadaan: true,
            charger: "ADA",
            laptop: "AMAN",
            keterangan: ""
          });
        }
      });
    }
  });

  return list;
}

/**
 * Generate Default Spare / Backup Laptops for Each Room & Ruang Guru
 */
function generateDefaultRoomBackups() {
  const backups = {};
  for (let r = 1; r <= 11; r++) {
    backups['Ruang ' + r] = [];
  }
  // Ruang Guru (Pusat Cadangan Sekolah) dimulai kosong sesuai instruksi panitia
  backups['Ruang Guru'] = [];
  return backups;
}

// Export for Node/CommonJS (if testing) or window for browser SPA
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROOMS_DATA, KNOWN_STUDENTS_META, TKA_DATES, generateMasterRekapList, generateDefaultRoomBackups };
}
