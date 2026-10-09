"""Four more synthetic discharge summaries (e to h) with their fixtures. Imported by make_data.py.
All people and hospitals are invented. Dates are relative so they work for any discharge date."""
HEAD = "DISCHARGE SUMMARY (SYNTHETIC DOCUMENT FOR DEMO. NOT A REAL PATIENT.)"
M = "medication"

TEXT = {
"e": f"""NEURO CARE CENTRE, CHENNAI
{HEAD}
Patient: Mr. Anand Pillai (synthetic)
Age/Sex: 66 / Male
Date of admission: 28 Sep 2026
Date of discharge: 12 Oct 2026
Diagnosis: Ischaemic stroke affecting the left side, now stable

MEDICATIONS ON DISCHARGE
Tab Clopidogrel 75 mg once daily in the morning after food
Tab Atorvastatin 40 mg once daily at night
Tab Amlodipine 5 mg once daily in the morning
Tab Pantoprazole 40 mg once daily in the morning before food

FOLLOW-UP
Review with the neurologist after 2 weeks.
MRI brain and carotid scan after 4 weeks.
Referred to the stroke rehabilitation clinic for physiotherapy after 1 week.
Speech therapy review after 10 days.
Blood test for lipids and sugar after 6 weeks.

REHAB AND ACTIVITY
Do the arm and leg exercises 3 times a day as the physiotherapist showed you.
Walk with support. Someone should stay with you for all walks.
Swallow slowly. Take small sips and small bites.

DIET
Eat a low salt diet. Avoid pickles and fried snacks.

WARNING SIGNS
Sudden weakness of the face, arm or leg, trouble speaking, or loss of balance. Call 108 at once.
Severe headache or repeated vomiting.
""",
"f": f"""LUNG AND CHEST HOSPITAL, CHENNAI
{HEAD}
Patient: Mr. Joseph Fernandes (synthetic)
Age/Sex: 69 / Male
Date of admission: 03 Oct 2026
Date of discharge: 12 Oct 2026
Diagnosis: Flare-up of chronic obstructive pulmonary disease (COPD)

MEDICATIONS ON DISCHARGE
Tab Prednisolone 30 mg once daily in the morning after food for 5 days
Tab Montelukast 10 mg once daily at night
Tiotropium 18 mcg inhaler capsule once daily in the morning
Salbutamol inhaler 2 puffs as needed for breathlessness

HOME OXYGEN
Use oxygen at 2 litres per minute for 12 hours a day. Adjust the flow only as the doctor advises.

FOLLOW-UP
Review with the chest physician after 1 week.
Lung function test (spirometry) after 4 weeks.
Referred to pulmonary rehabilitation after 3 weeks.
Flu vaccination at the clinic after 2 weeks.

CARE AT HOME
Do the breathing exercises 3 times a day.
Do not smoke. Stay away from smoke and dust.
Eat small meals more often. Drink warm water through the day.

WARNING SIGNS
Breathlessness not relieved by the inhaler. Call your doctor at once.
Lips turning blue, or fever above 100.4 F.
""",
"g": f"""CITY SURGICAL HOSPITAL, CHENNAI
{HEAD}
Patient: Ms. Divya Menon (synthetic)
Age/Sex: 28 / Female
Date of admission: 09 Oct 2026
Date of discharge: 12 Oct 2026
Diagnosis: Acute appendicitis
Procedure: Laparoscopic appendectomy on 10 Oct 2026

MEDICATIONS ON DISCHARGE
Tab Paracetamol 650 mg three times daily after food for 5 days
Tab Amoxicillin-clavulanate 625 mg twice daily after food for 5 days
Tab Pantoprazole 40 mg once daily in the morning before food for 5 days
Tab Tramadol 50 mg at night as needed for severe pain

WOUND CARE
Keep the three small wounds dry and covered for 2 days.
Dressing check at the clinic on day 3.
Stitch removal on day 10.

FOLLOW-UP
Review with the surgeon after 2 weeks.
Biopsy report review after 1 week.

ACTIVITY AND DIET
Walk short distances 3 times a day. Do not lift weights above 5 kg for 4 weeks.
Eat light food such as rice, curd and soup. Avoid spicy and oily food for 1 week.

WARNING SIGNS
Fever above 100.4 F, or redness, pus or swelling at a wound.
Severe belly pain or repeated vomiting.
""",
"h": f"""SILVERLINE HOSPITAL, CHENNAI
{HEAD}
Patient: Mrs. Meenakshi Sundaram (synthetic)
Age/Sex: 78 / Female
Date of admission: 04 Oct 2026
Date of discharge: 12 Oct 2026
Diagnosis: Pneumonia of the right lung

MEDICATIONS ON DISCHARGE
Tab Cefuroxime 500 mg twice daily after food for 5 days
Tab Azithromycin 500 mg once daily after food for 3 days
Tab Paracetamol 650 mg if required for fever
Syrup Ambroxol 10 ml three times daily after food for 5 days
Tab Amlodipine 5 mg once daily in the morning after food

FOLLOW-UP
Review with the physician after 1 week.
Blood test (CBC) after 1 week.
Repeat chest X-ray after 6 weeks.
Referred to a dietician for a high protein diet after 2 weeks.

CARE AT HOME
Sit up for meals and for 30 minutes after. Drink fluids through the day.
Check the oxygen level with a finger monitor 2 times a day. Normal is above 94.

WARNING SIGNS
Fast breathing, bluish lips, or oxygen level below 92. Call 108 at once.
Confusion or unusual drowsiness.
""",
}

# patient names, hospital line and dates change per patient. These lines are ignored when a text is matched to its fixture.
META = [
    {"key": "e", "file": "e_stroke_rehab.txt", "title": "Stroke with rehabilitation", "patient_alias": "Mr. A. Pillai (synthetic)",
     "discharge_date": "2026-10-12", "city": "Chennai", "pincode": "600040", "preferred_language": "en", "department": "neurology",
     "blurb": "Stroke medicines, a brain scan, physiotherapy and speech therapy."},
    {"key": "f", "file": "f_copd_flareup.txt", "title": "COPD flare-up with home oxygen", "patient_alias": "Mr. J. Fernandes (synthetic)",
     "discharge_date": "2026-10-12", "city": "Chennai", "pincode": "600004", "preferred_language": "en", "department": "pulmonology",
     "blurb": "Inhalers, home oxygen, a lung function test and breathing exercises."},
    {"key": "g", "file": "g_appendectomy.txt", "title": "Appendectomy with wound care", "patient_alias": "Ms. D. Menon (synthetic)",
     "discharge_date": "2026-10-12", "city": "Chennai", "pincode": "600032", "preferred_language": "en", "department": "general medicine",
     "blurb": "Pain medicine, wound care, stitch removal and a surgeon review."},
    {"key": "h", "file": "h_pneumonia_elderly.txt", "title": "Pneumonia in an older adult", "patient_alias": "Mrs. M. Sundaram (synthetic)",
     "discharge_date": "2026-10-12", "city": "Chennai", "pincode": "600010", "preferred_language": "en", "department": "pulmonology",
     "blurb": "Antibiotics, oxygen checks at home, a repeat chest X-ray and a diet referral."},
]

# find, category, title, date_raw, time_of_day, confidence, needs_review, en, ta, hi
ITEMS = {
"e": [
 ("Clopidogrel", M, "Clopidogrel 75 mg", None, "morning", .96, False,
  "Take Clopidogrel 75 mg once a day in the morning, after food.",
  "Clopidogrel 75 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்குப் பிறகு சாப்பிடவும்.",
  "Clopidogrel 75 mg की गोली दिन में एक बार सुबह खाने के बाद लें।"),
 ("Atorvastatin", M, "Atorvastatin 40 mg", None, "night", .96, False,
  "Take Atorvastatin 40 mg once a day at night.",
  "Atorvastatin 40 mg மாத்திரையை தினமும் ஒரு முறை இரவில் சாப்பிடவும்.",
  "Atorvastatin 40 mg की गोली दिन में एक बार रात को लें।"),
 ("Amlodipine", M, "Amlodipine 5 mg", None, "morning", .96, False,
  "Take Amlodipine 5 mg once a day in the morning.",
  "Amlodipine 5 mg மாத்திரையை தினமும் ஒரு முறை காலையில் சாப்பிடவும்.",
  "Amlodipine 5 mg की गोली दिन में एक बार सुबह लें।"),
 ("Pantoprazole", M, "Pantoprazole 40 mg", None, "morning", .96, False,
  "Take Pantoprazole 40 mg once a day in the morning, before food.",
  "Pantoprazole 40 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்கு முன் சாப்பிடவும்.",
  "Pantoprazole 40 mg की गोली दिन में एक बार सुबह खाने से पहले लें।"),
 ("Review with the neurologist", "appointment", "Neurologist visit", "after 2 weeks", None, .94, False,
  "Visit the nerve doctor (neurologist) after 2 weeks.",
  "2 வாரங்களுக்குப் பிறகு நரம்பியல் மருத்துவரைப் (neurologist) பார்க்கவும்.",
  "2 सप्ताह बाद न्यूरोलॉजिस्ट (नस रोग विशेषज्ञ) से मिलें।"),
 ("MRI brain", "test", "MRI brain and carotid scan", "after 4 weeks", None, .93, False,
  "Have the MRI brain and carotid scan done after 4 weeks.",
  "4 வாரங்களுக்குப் பிறகு MRI மூளை மற்றும் கரோடிட் ஸ்கேன் எடுக்கவும்.",
  "4 सप्ताह बाद मस्तिष्क का MRI और कैरोटिड स्कैन कराएं।"),
 ("stroke rehabilitation clinic", "rehab", "Stroke rehabilitation clinic", "after 1 week", None, .92, False,
  "Go to the stroke rehabilitation clinic for physiotherapy after 1 week.",
  "1 வாரத்திற்குப் பிறகு பக்கவாத மறுவாழ்வு கிளினிக்கில் உடற்பயிற்சி சிகிச்சைக்குச் செல்லவும்.",
  "1 सप्ताह बाद स्ट्रोक पुनर्वास क्लिनिक में फिजियोथेरेपी के लिए जाएं।"),
 ("Speech therapy", "referral", "Speech therapy review", "after 10 days", None, .92, False,
  "Have the speech therapy review after 10 days.",
  "10 நாட்களுக்குப் பிறகு பேச்சுப் பயிற்சி மறுபரிசோதனை செய்யவும்.",
  "10 दिन बाद स्पीच थेरेपी की जांच कराएं।"),
 ("Blood test for lipids", "test", "Blood test for lipids and sugar", "after 6 weeks", None, .93, False,
  "Have the blood test for lipids and sugar after 6 weeks.",
  "6 வாரங்களுக்குப் பிறகு கொழுப்பு மற்றும் சர்க்கரைக்கான இரத்த பரிசோதனை செய்யவும்.",
  "6 सप्ताह बाद वसा और शुगर की खून जांच कराएं।"),
 ("arm and leg exercises", "rehab", "Arm and leg exercises", None, "morning,afternoon,night", .9, False,
  "Do the arm and leg exercises 3 times a day, as the physiotherapist showed you.",
  "பிசியோதெரபிஸ்ட் காட்டியபடி கை மற்றும் கால் பயிற்சிகளை தினமும் 3 முறை செய்யவும்.",
  "फिजियोथेरेपिस्ट के बताए अनुसार हाथ और पैर की कसरत दिन में 3 बार करें।"),
 ("Walk with support", "activity", "Walk with support", None, None, .9, False,
  "Walk with support. Someone should stay with you for all walks.",
  "ஆதரவுடன் நடக்கவும். எல்லா நடைகளிலும் ஒருவர் உங்களுடன் இருக்க வேண்டும்.",
  "सहारे के साथ चलें। हर बार चलते समय कोई आपके साथ रहे।"),
 ("Swallow slowly", "diet", "Swallow slowly", None, None, .9, False,
  "Swallow slowly. Take small sips and small bites.",
  "மெதுவாக விழுங்கவும். சிறிய மிடறுகளும் சிறிய கவளங்களும் எடுக்கவும்.",
  "धीरे निगलें। छोटे घूंट और छोटे कौर लें।"),
 ("low salt diet", "diet", "Low salt diet", None, None, .93, False,
  "Eat a low salt diet. Avoid pickles and fried snacks.",
  "உப்பு குறைந்த உணவு சாப்பிடவும். ஊறுகாய் மற்றும் பொரித்த தின்பண்டங்களைத் தவிர்க்கவும்.",
  "कम नमक वाला खाना खाएं। अचार और तले नाश्ते से बचें।"),
 ("Sudden weakness", "warning_sign", "Sudden weakness or trouble speaking", None, None, .95, True,
  "Sudden weakness of the face, arm or leg, trouble speaking, or loss of balance is a warning sign. Call 108 at once.",
  "முகம், கை அல்லது காலில் திடீர் பலவீனம், பேச சிரமம் அல்லது சமநிலை இழப்பு எச்சரிக்கை அறிகுறி. உடனே 108 ஐ அழைக்கவும்.",
  "चेहरे, हाथ या पैर में अचानक कमज़ोरी, बोलने में तकलीफ़ या संतुलन खोना चेतावनी का संकेत है। तुरंत 108 पर कॉल करें।"),
 ("Severe headache", "warning_sign", "Severe headache or vomiting", None, None, .95, True,
  "Severe headache or repeated vomiting is a warning sign.",
  "கடுமையான தலைவலி அல்லது தொடர்ந்து வாந்தி எச்சரிக்கை அறிகுறி.",
  "तेज़ सिरदर्द या बार-बार उल्टी चेतावनी का संकेत है।"),
],
"f": [
 ("Prednisolone", M, "Prednisolone 30 mg", None, "morning", .95, False,
  "Take Prednisolone 30 mg once a day in the morning, after food, for 5 days.",
  "Prednisolone 30 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்குப் பிறகு 5 நாட்கள் சாப்பிடவும்.",
  "Prednisolone 30 mg की गोली दिन में एक बार सुबह खाने के बाद 5 दिन लें।"),
 ("Montelukast", M, "Montelukast 10 mg", None, "night", .96, False,
  "Take Montelukast 10 mg once a day at night.",
  "Montelukast 10 mg மாத்திரையை தினமும் ஒரு முறை இரவில் சாப்பிடவும்.",
  "Montelukast 10 mg की गोली दिन में एक बार रात को लें।"),
 ("Tiotropium", M, "Tiotropium 18 mcg", None, "morning", .94, False,
  "Use the Tiotropium 18 mcg inhaler capsule once a day in the morning.",
  "Tiotropium 18 mcg இன்ஹேலர் காப்ஸ்யூலை தினமும் ஒரு முறை காலையில் பயன்படுத்தவும்.",
  "Tiotropium 18 mcg इनहेलर कैप्सूल दिन में एक बार सुबह लें।"),
 ("Salbutamol", M, "Salbutamol inhaler", None, None, .85, True,
  "Use the Salbutamol inhaler, 2 puffs, when you are breathless. The wording says as needed.",
  "மூச்சுத் திணறல் இருக்கும்போது Salbutamol இன்ஹேலர் 2 புஃப் பயன்படுத்தவும். தேவைப்படும்போது என்று எழுதப்பட்டுள்ளது.",
  "सांस फूलने पर Salbutamol इनहेलर के 2 पफ लें। लिखा है ज़रूरत पड़ने पर।"),
 ("Use oxygen", "other", "Home oxygen", None, None, .8, True,
  "Use oxygen at 2 litres per minute for 12 hours a day. The flow is changed only as the doctor advises.",
  "ஒரு நாளைக்கு 12 மணி நேரம் நிமிடத்திற்கு 2 லிட்டர் ஆக்சிஜன் பயன்படுத்தவும். ஓட்டத்தை மருத்துவர் சொன்னபடி மட்டுமே மாற்றவும்.",
  "दिन में 12 घंटे प्रति मिनट 2 लीटर ऑक्सीजन लें। प्रवाह केवल डॉक्टर के कहने पर बदलें।"),
 ("chest physician", "appointment", "Chest physician visit", "after 1 week", None, .94, False,
  "Visit the chest doctor after 1 week.",
  "1 வாரத்திற்குப் பிறகு நெஞ்சு மருத்துவரைப் பார்க்கவும்.",
  "1 सप्ताह बाद छाती रोग विशेषज्ञ से मिलें।"),
 ("spirometry", "test", "Lung function test", "after 4 weeks", None, .93, False,
  "Have the lung function test (spirometry) after 4 weeks.",
  "4 வாரங்களுக்குப் பிறகு நுரையீரல் செயல்பாட்டு பரிசோதனை (spirometry) செய்யவும்.",
  "4 सप्ताह बाद फेफड़ों की जांच (spirometry) कराएं।"),
 ("pulmonary rehabilitation", "rehab", "Pulmonary rehabilitation", "after 3 weeks", None, .92, False,
  "Start pulmonary rehabilitation after 3 weeks.",
  "3 வாரங்களுக்குப் பிறகு நுரையீரல் மறுவாழ்வு பயிற்சியைத் தொடங்கவும்.",
  "3 सप्ताह बाद फेफड़ों का पुनर्वास शुरू करें।"),
 ("Flu vaccination", "appointment", "Flu vaccination", "after 2 weeks", None, .92, False,
  "Get the flu vaccination at the clinic after 2 weeks.",
  "2 வாரங்களுக்குப் பிறகு கிளினிக்கில் காய்ச்சல் தடுப்பூசி போட்டுக்கொள்ளவும்.",
  "2 सप्ताह बाद क्लिनिक में फ्लू का टीका लगवाएं।"),
 ("breathing exercises", "rehab", "Breathing exercises", None, "morning,afternoon,night", .9, False,
  "Do the breathing exercises 3 times a day.",
  "சுவாசப் பயிற்சிகளை தினமும் 3 முறை செய்யவும்.",
  "सांस की कसरत दिन में 3 बार करें।"),
 ("Do not smoke", "activity", "No smoke or dust", None, None, .9, False,
  "Do not smoke. Stay away from smoke and dust.",
  "புகைபிடிக்க வேண்டாம். புகை மற்றும் தூசியிலிருந்து விலகி இருக்கவும்.",
  "धूम्रपान न करें। धुएं और धूल से दूर रहें।"),
 ("small meals more often", "diet", "Small meals and warm water", None, None, .9, False,
  "Eat small meals more often. Drink warm water through the day.",
  "அடிக்கடி சிறிய அளவில் சாப்பிடவும். நாள் முழுவதும் வெதுவெதுப்பான நீர் குடிக்கவும்.",
  "थोड़ा-थोड़ा करके बार-बार खाएं। दिन भर गुनगुना पानी पिएं।"),
 ("not relieved by the inhaler", "warning_sign", "Breathlessness not relieved", None, None, .95, True,
  "Breathlessness that the inhaler does not relieve is a warning sign. Call your doctor at once.",
  "இன்ஹேலரால் குறையாத மூச்சுத் திணறல் எச்சரிக்கை அறிகுறி. உடனே மருத்துவரை அழைக்கவும்.",
  "इनहेलर से न घटने वाली सांस फूलना चेतावनी का संकेत है। तुरंत डॉक्टर को बुलाएं।"),
 ("Lips turning blue", "warning_sign", "Blue lips or fever", None, None, .95, True,
  "Lips turning blue, or fever above 100.4 F, is a warning sign.",
  "உதடுகள் நீலமாதல் அல்லது 100.4 F க்கு மேல் காய்ச்சல் எச்சரிக்கை அறிகுறி.",
  "होंठ नीले पड़ना या 100.4 F से ऊपर बुखार चेतावनी का संकेत है।"),
],
"g": [
 ("Paracetamol", M, "Paracetamol 650 mg", None, "morning,afternoon,night", .96, False,
  "Take Paracetamol 650 mg three times a day, after food, for 5 days.",
  "Paracetamol 650 mg மாத்திரையை தினமும் மூன்று முறை உணவுக்குப் பிறகு 5 நாட்கள் சாப்பிடவும்.",
  "Paracetamol 650 mg की गोली दिन में तीन बार खाने के बाद 5 दिन लें।"),
 ("Amoxicillin", M, "Amoxicillin-clavulanate 625 mg", None, "morning,night", .95, False,
  "Take Amoxicillin-clavulanate 625 mg twice a day, after food, for 5 days.",
  "Amoxicillin-clavulanate 625 mg மாத்திரையை தினமும் இரண்டு முறை உணவுக்குப் பிறகு 5 நாட்கள் சாப்பிடவும்.",
  "Amoxicillin-clavulanate 625 mg की गोली दिन में दो बार खाने के बाद 5 दिन लें।"),
 ("Pantoprazole", M, "Pantoprazole 40 mg", None, "morning", .96, False,
  "Take Pantoprazole 40 mg once a day in the morning, before food, for 5 days.",
  "Pantoprazole 40 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்கு முன் 5 நாட்கள் சாப்பிடவும்.",
  "Pantoprazole 40 mg की गोली दिन में एक बार सुबह खाने से पहले 5 दिन लें।"),
 ("Tramadol", M, "Tramadol 50 mg", None, "night", .85, True,
  "Tramadol 50 mg at night for severe pain. The wording says as needed.",
  "கடுமையான வலிக்கு இரவில் Tramadol 50 mg. தேவைப்படும்போது என்று எழுதப்பட்டுள்ளது.",
  "तेज़ दर्द में रात को Tramadol 50 mg। लिखा है ज़रूरत पड़ने पर।"),
 ("three small wounds", "wound_care", "Keep wounds dry", "after 2 days", None, .9, False,
  "Keep the three small wounds dry and covered for 2 days.",
  "மூன்று சிறிய காயங்களை 2 நாட்கள் உலர்வாகவும் மூடியும் வைக்கவும்.",
  "तीन छोटे घावों को 2 दिन सूखा और ढका रखें।"),
 ("Dressing check", "wound_care", "Dressing check at the clinic", "day 3", None, .94, False,
  "Have the dressing checked at the clinic on day 3.",
  "3 ஆம் நாள் கிளினிக்கில் கட்டை சரிபார்க்கவும்.",
  "तीसरे दिन क्लिनिक में पट्टी की जांच कराएं।"),
 ("Stitch removal", "wound_care", "Stitch removal", "day 10", None, .94, False,
  "Have the stitches removed on day 10.",
  "10 ஆம் நாள் தையல்களை அகற்றவும்.",
  "दसवें दिन टांके हटवाएं।"),
 ("Review with the surgeon", "appointment", "Surgeon review", "after 2 weeks", None, .94, False,
  "Visit the surgeon after 2 weeks.",
  "2 வாரங்களுக்குப் பிறகு அறுவை சிகிச்சை மருத்துவரைப் பார்க்கவும்.",
  "2 सप्ताह बाद सर्जन से मिलें।"),
 ("Biopsy report", "appointment", "Biopsy report review", "after 1 week", None, .93, False,
  "Review the biopsy report after 1 week.",
  "1 வாரத்திற்குப் பிறகு பயாப்ஸி அறிக்கையை மருத்துவருடன் பார்க்கவும்.",
  "1 सप्ताह बाद बायोप्सी रिपोर्ट डॉक्टर के साथ देखें।"),
 ("Walk short distances", "activity", "Walk and no heavy lifting", None, None, .92, False,
  "Walk short distances 3 times a day. Do not lift weights above 5 kg for 4 weeks.",
  "தினமும் 3 முறை குறுகிய தூரம் நடக்கவும். 4 வாரங்களுக்கு 5 kg க்கு மேல் எடை தூக்க வேண்டாம்.",
  "दिन में 3 बार थोड़ी दूरी चलें। 4 सप्ताह तक 5 kg से ज़्यादा वज़न न उठाएं।"),
 ("light food", "diet", "Light food", None, None, .92, False,
  "Eat light food such as rice, curd and soup. Avoid spicy and oily food for 1 week.",
  "சாதம், தயிர், சூப் போன்ற இலகுவான உணவு சாப்பிடவும். 1 வாரத்திற்கு காரமான மற்றும் எண்ணெய் உணவைத் தவிர்க்கவும்.",
  "चावल, दही और सूप जैसा हल्का खाना खाएं। 1 सप्ताह तक मसालेदार और तला खाना न खाएं।"),
 ("Fever above", "warning_sign", "Fever or wound problem", None, None, .95, True,
  "Fever above 100.4 F, or redness, pus or swelling at a wound, is a warning sign.",
  "100.4 F க்கு மேல் காய்ச்சல், அல்லது காயத்தில் சிவப்பு, சீழ் அல்லது வீக்கம் எச்சரிக்கை அறிகுறி.",
  "100.4 F से ऊपर बुखार, या घाव पर लालिमा, मवाद या सूजन चेतावनी का संकेत है।"),
 ("Severe belly pain", "warning_sign", "Severe belly pain or vomiting", None, None, .95, True,
  "Severe belly pain or repeated vomiting is a warning sign.",
  "கடுமையான வயிற்று வலி அல்லது தொடர்ந்து வாந்தி எச்சரிக்கை அறிகுறி.",
  "पेट में तेज़ दर्द या बार-बार उल्टी चेतावनी का संकेत है।"),
],
"h": [
 ("Cefuroxime", M, "Cefuroxime 500 mg", None, "morning,night", .96, False,
  "Take Cefuroxime 500 mg twice a day, after food, for 5 days.",
  "Cefuroxime 500 mg மாத்திரையை தினமும் இரண்டு முறை உணவுக்குப் பிறகு 5 நாட்கள் சாப்பிடவும்.",
  "Cefuroxime 500 mg की गोली दिन में दो बार खाने के बाद 5 दिन लें।"),
 ("Azithromycin", M, "Azithromycin 500 mg", None, "morning", .96, False,
  "Take Azithromycin 500 mg once a day, after food, for 3 days.",
  "Azithromycin 500 mg மாத்திரையை தினமும் ஒரு முறை உணவுக்குப் பிறகு 3 நாட்கள் சாப்பிடவும்.",
  "Azithromycin 500 mg की गोली दिन में एक बार खाने के बाद 3 दिन लें।"),
 ("Paracetamol", M, "Paracetamol 650 mg", None, None, .85, True,
  "Paracetamol 650 mg for fever. The wording says if required.",
  "காய்ச்சலுக்கு Paracetamol 650 mg. தேவைப்பட்டால் என்று எழுதப்பட்டுள்ளது.",
  "बुखार के लिए Paracetamol 650 mg। लिखा है ज़रूरत हो तो।"),
 ("Ambroxol", M, "Ambroxol 10 ml", None, "morning,afternoon,night", .95, False,
  "Take Ambroxol syrup 10 ml three times a day, after food, for 5 days.",
  "Ambroxol சிரப் 10 ml தினமும் மூன்று முறை உணவுக்குப் பிறகு 5 நாட்கள் குடிக்கவும்.",
  "Ambroxol सिरप 10 ml दिन में तीन बार खाने के बाद 5 दिन लें।"),
 ("Amlodipine", M, "Amlodipine 5 mg", None, "morning", .96, False,
  "Take Amlodipine 5 mg once a day in the morning, after food.",
  "Amlodipine 5 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்குப் பிறகு சாப்பிடவும்.",
  "Amlodipine 5 mg की गोली दिन में एक बार सुबह खाने के बाद लें।"),
 ("Review with the physician", "appointment", "Physician visit", "after 1 week", None, .94, False,
  "Visit the physician after 1 week.",
  "1 வாரத்திற்குப் பிறகு மருத்துவரைப் பார்க்கவும்.",
  "1 सप्ताह बाद फिजिशियन से मिलें।"),
 ("Blood test (CBC)", "test", "Blood test (CBC)", "after 1 week", None, .94, False,
  "Have the blood test (CBC) after 1 week.",
  "1 வாரத்திற்குப் பிறகு இரத்த பரிசோதனை (CBC) செய்யவும்.",
  "1 सप्ताह बाद खून की जांच (CBC) कराएं।"),
 ("Repeat chest X-ray", "test", "Repeat chest X-ray", "after 6 weeks", None, .94, False,
  "Have a repeat chest X-ray after 6 weeks.",
  "6 வாரங்களுக்குப் பிறகு மீண்டும் மார்பு X-ray எடுக்கவும்.",
  "6 सप्ताह बाद छाती का X-ray दोबारा कराएं।"),
 ("dietician", "referral", "Dietician visit", "after 2 weeks", None, .92, False,
  "See a dietician for a high protein diet after 2 weeks.",
  "2 வாரங்களுக்குப் பிறகு அதிக புரத உணவுக்காக உணவு நிபுணரைப் பார்க்கவும்.",
  "2 सप्ताह बाद उच्च प्रोटीन आहार के लिए आहार विशेषज्ञ से मिलें।"),
 ("Sit up for meals", "activity", "Sit up for meals", None, None, .9, False,
  "Sit up for meals and for 30 minutes after. Drink fluids through the day.",
  "உணவின்போதும் அதற்குப் பிறகு 30 நிமிடங்களும் நிமிர்ந்து அமரவும். நாள் முழுவதும் திரவங்கள் குடிக்கவும்.",
  "खाने के समय और उसके 30 मिनट बाद सीधे बैठें। दिन भर तरल पदार्थ पिएं।"),
 ("finger monitor", "other", "Check oxygen level", None, "morning,night", .9, False,
  "Check the oxygen level with a finger monitor 2 times a day. Normal is above 94.",
  "விரல் மானிட்டரால் ஆக்சிஜன் அளவை தினமும் 2 முறை பார்க்கவும். இயல்பு அளவு 94 க்கு மேல்.",
  "फिंगर मॉनिटर से ऑक्सीजन स्तर दिन में 2 बार देखें। सामान्य स्तर 94 से ऊपर है।"),
 ("Fast breathing", "warning_sign", "Fast breathing or low oxygen", None, None, .95, True,
  "Fast breathing, bluish lips, or an oxygen level below 92 is a warning sign. Call 108 at once.",
  "வேகமான சுவாசம், நீல உதடுகள் அல்லது 92 க்கு கீழ் ஆக்சிஜன் அளவு எச்சரிக்கை அறிகுறி. உடனே 108 ஐ அழைக்கவும்.",
  "तेज़ सांस, नीले होंठ या 92 से नीचे ऑक्सीजन स्तर चेतावनी का संकेत है। तुरंत 108 पर कॉल करें।"),
 ("Confusion", "warning_sign", "Confusion or drowsiness", None, None, .95, True,
  "Confusion or unusual drowsiness is a warning sign.",
  "குழப்பம் அல்லது வழக்கத்திற்கு மாறான தூக்கக் கலக்கம் எச்சரிக்கை அறிகுறி.",
  "भ्रम या असामान्य सुस्ती चेतावनी का संकेत है।"),
],
}
