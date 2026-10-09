"""Regenerates samples, fixtures, providers.csv and the sample PDF.
Run from backend/:  .venv/Scripts/python data/make_data.py
All people, hospitals, phone numbers and providers are invented."""
import csv
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.agents.ingest import to_lines  # noqa: E402

D = ROOT / "data"
HEAD = "DISCHARGE SUMMARY (SYNTHETIC DOCUMENT FOR DEMO. NOT A REAL PATIENT.)"

TEXT = {
"a": f"""CITY HEART INSTITUTE, CHENNAI
{HEAD}
Patient: Mr. Ramesh Iyer (synthetic)
Age/Sex: 62 / Male
Date of admission: 05 Oct 2026
Date of discharge: 10 Oct 2026
Diagnosis: Acute inferior wall myocardial infarction treated with angioplasty and one stent
Procedure: Primary angioplasty to the right coronary artery on 05 Oct 2026

MEDICATIONS ON DISCHARGE
Tab Aspirin 75 mg once daily in the morning after food
Tab Clopidogrel 75 mg once daily in the morning
Tab Atorvastatin 40 mg once daily at night
Tab Metoprolol 25 mg twice daily, morning and night
Tab Pantoprazole 40 mg once daily in the morning before food

FOLLOW-UP
Review with the cardiologist at City Heart Institute after 2 weeks with an ECG.
Fasting lipid profile and blood sugar test after 4 weeks.
Referred to the cardiac rehabilitation clinic for a supervised walking program after 6 weeks.
Keep the wrist puncture site dry and clean for 3 days.

DIET AND ACTIVITY
Eat a low salt, low fat diet. Avoid fried and oily food.
Walk slowly for 10 minutes twice a day and add a few minutes each week.
Do not lift heavy weights or drive for 2 weeks.

WARNING SIGNS
Chest pain or pressure lasting more than 15 minutes. Call 108 at once.
Sudden breathlessness, heavy sweating, or fainting.
Swelling, bleeding, or severe pain at the wrist puncture site.
""",
"b": f"""SUNRISE ORTHOPAEDIC HOSPITAL, NEW DELHI
{HEAD}
Patient: Mrs. Sunita Verma (synthetic)
Age/Sex: 68 / Female
Date of admission: 06 Oct 2026
Date of discharge: 11 Oct 2026
Diagnosis: Severe osteoarthritis of the right knee
Procedure: Right total knee replacement on 07 Oct 2026

MEDICATIONS ON DISCHARGE
Tab Paracetamol 650 mg three times daily after food for 7 days
Tab Rivaroxaban 10 mg once daily at night for 14 days
Tab Calcium 500 mg with Vitamin D3 once daily in the afternoon after lunch
Tab Pantoprazole 40 mg once daily in the morning before food

WOUND CARE
Keep the knee wound dry and covered. Do not wet the dressing.
Dressing change at the clinic on day 5.
Stitch removal on day 14 at the orthopaedic clinic.

FOLLOW-UP
Orthopaedic surgeon review after 6 weeks with a knee X-ray.
Blood test (CBC) on 18 Oct 2026.
Referred to physiotherapy: 3 sessions per week for 6 weeks, starting from 14 Oct 2026.

REHAB AND ACTIVITY
Do the knee bending and straightening exercises 3 times a day as the physiotherapist showed you.
Walk with a walker for short distances. Do not climb stairs without support.
Do not sit on low chairs or cross your legs for 6 weeks.

DIET
Eat protein-rich food such as dal, eggs and milk. Drink plenty of water.

WARNING SIGNS
Fever above 100.4 F or redness, pus, or swelling at the wound.
Calf pain, swelling of the leg, or sudden shortness of breath.
""",
"c": f"""MARINA MEDICAL CENTRE, CHENNAI
{HEAD}
Patient: Mr. Karthik Subramanian (synthetic)
Age/Sex: 55 / Male
Date of admission: 08 Oct 2026
Date of discharge: 12 Oct 2026
Diagnosis: Type 2 diabetes mellitus with very high blood sugar

MEDICATIONS ON DISCHARGE
Tab Metformin 500 mg twice daily after breakfast and dinner
Tab Glimepiride 1 mg once daily in the morning before breakfast
Insulin glargine 10 units under the skin once daily at night. This is a new medicine started in hospital.
Tab Atorvastatin 10 mg once daily at night

SUGAR CHECKS AND INSULIN
Check blood sugar before breakfast and at bedtime every day and write it in the diary.
The nurse trained the family to give the insulin injection. Change the injection site every day.

FOLLOW-UP
Review with the diabetologist at Marina Medical Centre after 1 week with the sugar diary.
HbA1c and kidney function tests after 3 months.
Referred to an eye specialist for a retina check within 1 month.
Referred to a dietician for a diabetic diet plan on 20 Oct 2026.

DIET AND ACTIVITY
Eat small meals every 3 to 4 hours. Avoid sugar, sweets, and sweetened drinks.
Include vegetables, dal, and whole grains in each meal.
Walk for 30 minutes every day after dinner.

WARNING SIGNS
Sweating, shaking, hunger, or confusion can mean low blood sugar. Call your doctor at once.
Blood sugar above 300 mg/dl on two readings. Call your doctor.
""",
"d": f"""GREEN LEAF HOSPITAL, CHENNAI
{HEAD}
Patient: Mrs. Lakshmi Narayanan (synthetic)
Age/Sex: 71 / Female
Date of admission: 08 Oct 2026
Date of discharge: 12 Oct 2026
Diagnosis: Chest infection with high blood pressure

MEDICATIONS
Tab Amlodipine 5 mg once daily in the morning, may increase to 10 mg if BP stays high
Tab Azithromycin 500 mg once daily for 3 days. Stop when better.
Cough syrup 10 ml as needed for cough
Tab Paracetamol 650 mg if required for fever
Stop the old BP tablet. Continue the old BP tablet in the morning.
Tab Pantoprazole 40 mg once daily in the morning before food

FOLLOW-UP
See Dr. Mehta, physician, at Green Leaf Hospital on 20 Oct 2026.
Come for a review sometime next week.
Chest X-ray to be done, date to be decided.
Review with the chest specialist after the reports.
Blood test for kidney function when the doctor advises.
Refer to a dietician as needed.

CARE AT HOME
Rest at home. Activity can be adjusted as per comfort.
Avoid salt in food.
Drink plenty of fluids, but restrict fluids if there is leg swelling.

WARNING SIGNS
Fever returning, fast breathing, or bluish lips.
Feeling very dizzy or confused.
""",
}

META = [
    {"key": "a", "file": "a_heart_attack_angioplasty.txt", "title": "Heart attack with angioplasty",
     "patient_alias": "Mr. R. Iyer (synthetic)", "discharge_date": "2026-10-10", "city": "Chennai",
     "pincode": "600017", "preferred_language": "ta",
     "blurb": "Medicines for the heart, a check-up with ECG, and a rehabilitation referral."},
    {"key": "b", "file": "b_knee_replacement.txt", "title": "Knee replacement with physiotherapy",
     "patient_alias": "Mrs. S. Verma (synthetic)", "discharge_date": "2026-10-11", "city": "Delhi",
     "pincode": "110024", "preferred_language": "hi",
     "blurb": "Wound care, stitch removal, physiotherapy sessions and a blood test."},
    {"key": "c", "file": "c_diabetes_new_insulin.txt", "title": "Type 2 diabetes with new insulin",
     "patient_alias": "Mr. K. Subramanian (synthetic)", "discharge_date": "2026-10-12", "city": "Chennai",
     "pincode": "600020", "preferred_language": "en",
     "blurb": "New insulin, sugar checks, a diet plan and an eye check referral."},
    {"key": "d", "file": "d_messy_unclear.txt", "title": "Unclear summary (needs human review)",
     "patient_alias": "Mrs. L. Narayanan (synthetic)", "discharge_date": "2026-10-12", "city": "Chennai",
     "pincode": "600042", "preferred_language": "en",
     "blurb": "Vague wording, a missing date and conflicting lines, so many items go to a reviewer."},
]

# find, category, title, date_raw, time_of_day, confidence, needs_review, en, ta, hi
M = "medication"
ITEMS = {
"a": [
 ("Aspirin", M, "Aspirin 75 mg", None, "morning", .96, False,
  "Take Aspirin 75 mg once a day in the morning, after food.",
  "Aspirin 75 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்குப் பிறகு சாப்பிடவும்.",
  "Aspirin 75 mg की गोली दिन में एक बार सुबह खाने के बाद लें।"),
 ("Clopidogrel", M, "Clopidogrel 75 mg", None, "morning", .96, False,
  "Take Clopidogrel 75 mg once a day in the morning.",
  "Clopidogrel 75 mg மாத்திரையை தினமும் ஒரு முறை காலையில் சாப்பிடவும்.",
  "Clopidogrel 75 mg की गोली दिन में एक बार सुबह लें।"),
 ("Atorvastatin", M, "Atorvastatin 40 mg", None, "night", .96, False,
  "Take Atorvastatin 40 mg once a day at night.",
  "Atorvastatin 40 mg மாத்திரையை தினமும் ஒரு முறை இரவில் சாப்பிடவும்.",
  "Atorvastatin 40 mg की गोली दिन में एक बार रात को लें।"),
 ("Metoprolol", M, "Metoprolol 25 mg", None, "morning,night", .95, False,
  "Take Metoprolol 25 mg twice a day, once in the morning and once at night.",
  "Metoprolol 25 mg மாத்திரையை தினமும் இரண்டு முறை, காலையிலும் இரவிலும் சாப்பிடவும்.",
  "Metoprolol 25 mg की गोली दिन में दो बार, सुबह और रात को लें।"),
 ("Pantoprazole", M, "Pantoprazole 40 mg", None, "morning", .96, False,
  "Take Pantoprazole 40 mg once a day in the morning, before food.",
  "Pantoprazole 40 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்கு முன் சாப்பிடவும்.",
  "Pantoprazole 40 mg की गोली दिन में एक बार सुबह खाने से पहले लें।"),
 ("Review with the cardiologist", "appointment", "Heart doctor visit with ECG", "after 2 weeks", None, .94, False,
  "Visit the heart doctor (cardiologist) at City Heart Institute after 2 weeks. You will have an ECG test.",
  "2 வாரங்களுக்குப் பிறகு City Heart Institute-இல் இதய மருத்துவரைப் (cardiologist) பார்க்கவும். ECG பரிசோதனை செய்யப்படும்.",
  "2 सप्ताह बाद City Heart Institute में हृदय रोग विशेषज्ञ (cardiologist) से मिलें। ECG जांच होगी।"),
 ("Fasting lipid", "test", "Lipid profile and blood sugar test", "after 4 weeks", None, .93, False,
  "Get a blood test for fats (lipid profile) and sugar after 4 weeks. Do not eat before the test.",
  "4 வாரங்களுக்குப் பிறகு இரத்தத்தில் கொழுப்பு (lipid profile) மற்றும் சர்க்கரை பரிசோதனை செய்யவும். பரிசோதனைக்கு முன் சாப்பிட வேண்டாம்.",
  "4 सप्ताह बाद खून में चर्बी (lipid profile) और शुगर की जांच कराएं। जांच से पहले कुछ न खाएं।"),
 ("Referred to the cardiac", "referral", "Cardiac rehabilitation clinic", "after 6 weeks", None, .92, False,
  "You are referred to a cardiac rehabilitation clinic for a supervised walking program, after 6 weeks.",
  "6 வாரங்களுக்குப் பிறகு, கண்காணிப்புடன் நடைப்பயிற்சி செய்ய இதய மறுவாழ்வு மையத்திற்கு (cardiac rehabilitation) அனுப்பப்பட்டுள்ளீர்கள்.",
  "आपको 6 सप्ताह बाद निगरानी में चलने के कार्यक्रम के लिए हृदय पुनर्वास क्लिनिक (cardiac rehabilitation) भेजा गया है।"),
 ("wrist puncture site dry", "wound_care", "Wrist wound care", None, None, .9, False,
  "Keep the wrist puncture site dry and clean for 3 days.",
  "கை மணிக்கட்டில் ஊசி போட்ட இடத்தை 3 நாட்கள் உலர்வாகவும் சுத்தமாகவும் வைத்திருங்கள்.",
  "कलाई के पंक्चर वाले स्थान को 3 दिन सूखा और साफ रखें।"),
 ("low salt", "diet", "Low salt, low fat diet", None, None, .93, False,
  "Eat food with low salt and low fat. Avoid fried and oily food.",
  "உப்பு மற்றும் கொழுப்பு குறைவான உணவை சாப்பிடுங்கள். வறுத்த மற்றும் எண்ணெய் அதிகமான உணவைத் தவிர்க்கவும்.",
  "कम नमक और कम चर्बी वाला खाना खाएं। तला हुआ और तेलीय खाना न खाएं।"),
 ("Walk slowly", "activity", "Slow daily walking", None, None, .9, False,
  "Walk slowly for 10 minutes, two times a day. Add a few minutes each week.",
  "மெதுவாக 10 நிமிடங்கள், ஒரு நாளில் இரண்டு முறை நடக்கவும். ஒவ்வொரு வாரமும் சில நிமிடங்கள் கூட்டவும்.",
  "धीरे-धीरे 10 मिनट चलें, दिन में दो बार। हर सप्ताह कुछ मिनट बढ़ाएं।"),
 ("lift heavy weights", "activity", "No heavy lifting or driving", None, None, .92, False,
  "Do not lift heavy weights or drive for 2 weeks.",
  "2 வாரங்களுக்கு கனமான பொருட்களைத் தூக்கவோ வாகனம் ஓட்டவோ வேண்டாம்.",
  "2 सप्ताह तक भारी वजन न उठाएं और गाड़ी न चलाएं।"),
 ("Chest pain", "warning_sign", "Chest pain or pressure", None, None, .95, True,
  "Call 108 at once if you have chest pain or pressure that lasts more than 15 minutes.",
  "மார்பில் வலி அல்லது அழுத்தம் 15 நிமிடங்களுக்கு மேல் நீடித்தால் உடனே 108 ஐ அழைக்கவும்.",
  "सीने में दर्द या दबाव 15 मिनट से ज़्यादा रहे तो तुरंत 108 पर कॉल करें।"),
 ("Sudden breathlessness", "warning_sign", "Sudden breathlessness or fainting", None, None, .95, True,
  "Sudden breathlessness, heavy sweating, or fainting are warning signs.",
  "திடீர் மூச்சுத் திணறல், அதிக வியர்வை அல்லது மயக்கம் ஆகியவை எச்சரிக்கை அறிகுறிகள்.",
  "अचानक सांस फूलना, बहुत पसीना आना या बेहोशी चेतावनी के संकेत हैं।"),
 ("Swelling, bleeding", "warning_sign", "Problem at the wrist site", None, None, .95, True,
  "Swelling, bleeding, or severe pain at the wrist puncture site are warning signs.",
  "கை மணிக்கட்டில் ஊசி போட்ட இடத்தில் வீக்கம், இரத்தப்போக்கு அல்லது கடுமையான வலி ஆகியவை எச்சரிக்கை அறிகுறிகள்.",
  "कलाई के पंक्चर वाले स्थान पर सूजन, खून बहना या तेज़ दर्द चेतावनी के संकेत हैं।"),
],
"b": [
 ("Paracetamol", M, "Paracetamol 650 mg", None, "morning,afternoon,night", .96, False,
  "Take Paracetamol 650 mg three times a day, after food, for 7 days.",
  "Paracetamol 650 mg மாத்திரையை தினமும் மூன்று முறை, உணவுக்குப் பிறகு, 7 நாட்களுக்கு சாப்பிடவும்.",
  "Paracetamol 650 mg की गोली दिन में तीन बार, खाने के बाद, 7 दिन तक लें।"),
 ("Rivaroxaban", M, "Rivaroxaban 10 mg", None, "night", .96, False,
  "Take Rivaroxaban 10 mg once a day at night, for 14 days.",
  "Rivaroxaban 10 mg மாத்திரையை தினமும் ஒரு முறை இரவில், 14 நாட்களுக்கு சாப்பிடவும்.",
  "Rivaroxaban 10 mg की गोली दिन में एक बार रात को, 14 दिन तक लें।"),
 ("Calcium", M, "Calcium 500 mg with Vitamin D3", None, "afternoon", .95, False,
  "Take Calcium 500 mg with Vitamin D3 once a day in the afternoon, after lunch.",
  "Calcium 500 mg with Vitamin D3 மாத்திரையை தினமும் ஒரு முறை மதியம் உணவுக்குப் பிறகு சாப்பிடவும்.",
  "Calcium 500 mg with Vitamin D3 की गोली दिन में एक बार दोपहर को खाने के बाद लें।"),
 ("Pantoprazole", M, "Pantoprazole 40 mg", None, "morning", .96, False,
  "Take Pantoprazole 40 mg once a day in the morning, before food.",
  "Pantoprazole 40 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்கு முன் சாப்பிடவும்.",
  "Pantoprazole 40 mg की गोली दिन में एक बार सुबह खाने से पहले लें।"),
 ("Keep the knee wound", "wound_care", "Knee wound care", None, None, .93, False,
  "Keep the knee wound dry and covered. Do not wet the dressing.",
  "முழங்கால் காயத்தை உலர்வாகவும் மூடியும் வைத்திருங்கள். கட்டை நனைக்க வேண்டாம்.",
  "घुटने के घाव को सूखा और ढका रखें। पट्टी गीली न करें।"),
 ("Dressing change", "wound_care", "Dressing change at the clinic", "on day 5", None, .92, False,
  "Get your dressing changed at the clinic on day 5.",
  "5 ஆம் நாள் மருத்துவமனையில் கட்டை மாற்றிக்கொள்ளுங்கள்.",
  "दिन 5 पर क्लिनिक में पट्टी बदलवाएं।"),
 ("Stitch removal", "appointment", "Stitch removal", "on day 14", None, .92, False,
  "Visit the orthopaedic clinic on day 14 to have the stitches removed.",
  "14 ஆம் நாள் எலும்பு மருத்துவ கிளினிக்கில் தையல்களை அகற்றிக்கொள்ளுங்கள்.",
  "दिन 14 पर हड्डी रोग क्लिनिक में टांके हटवाएं।"),
 ("Orthopaedic surgeon review", "appointment", "Knee surgeon review with X-ray", "after 6 weeks", None, .93, False,
  "See your bone surgeon (orthopaedic surgeon) after 6 weeks. You will have a knee X-ray.",
  "6 வாரங்களுக்குப் பிறகு எலும்பு அறுவை மருத்துவரைப் (orthopaedic surgeon) பார்க்கவும். முழங்கால் X-ray எடுக்கப்படும்.",
  "6 सप्ताह बाद हड्डी रोग सर्जन (orthopaedic surgeon) से मिलें। घुटने का X-ray होगा।"),
 ("Blood test (CBC)", "test", "Blood test (CBC)", "18 Oct 2026", None, .95, False,
  "Get a blood test (CBC) on 18 October 2026.",
  "18 அக்டோபர் 2026 அன்று இரத்த பரிசோதனை (CBC) செய்யவும்.",
  "18 अक्टूबर 2026 को खून की जांच (CBC) कराएं।"),
 ("Referred to physiotherapy", "referral", "Physiotherapy", "14 Oct 2026", None, .94, False,
  "You are referred to physiotherapy: 3 sessions per week for 6 weeks, starting from 14 October 2026.",
  "பிசியோதெரபிக்கு அனுப்பப்பட்டுள்ளீர்கள்: வாரத்திற்கு 3 முறை, 6 வாரங்கள், 14 அக்டோபர் 2026 முதல்.",
  "आपको फिजियोथेरेपी के लिए भेजा गया है: सप्ताह में 3 सत्र, 6 सप्ताह तक, 14 अक्टूबर 2026 से।"),
 ("knee bending", "rehab", "Knee exercises", None, None, .92, False,
  "Do the knee bending and straightening exercises 3 times a day, as the physiotherapist showed you.",
  "பிசியோதெரபிஸ்ட் காட்டியபடி முழங்காலை மடக்கி நீட்டும் பயிற்சிகளை ஒரு நாளில் 3 முறை செய்யவும்.",
  "फिजियोथेरेपिस्ट के बताए अनुसार घुटना मोड़ने और सीधा करने के व्यायाम दिन में 3 बार करें।"),
 ("walker", "activity", "Walking with a walker", None, None, .92, False,
  "Walk with a walker for short distances. Do not climb stairs without support.",
  "நடைபயில் கருவியுடன் (walker) குறுகிய தூரம் நடக்கவும். ஆதரவு இல்லாமல் படிக்கட்டு ஏற வேண்டாம்.",
  "छोटी दूरी के लिए वॉकर के साथ चलें। सहारे के बिना सीढ़ियां न चढ़ें।"),
 ("low chairs", "activity", "Sitting and leg position", None, None, .92, False,
  "Do not sit on low chairs or cross your legs for 6 weeks.",
  "6 வாரங்களுக்கு தாழ்வான நாற்காலிகளில் உட்கார வேண்டாம், கால்களை குறுக்காக வைக்க வேண்டாம்.",
  "6 सप्ताह तक नीची कुर्सियों पर न बैठें और पैर क्रॉस न करें।"),
 ("protein-rich", "diet", "Protein-rich food", None, None, .92, False,
  "Eat protein-rich food such as dal, eggs and milk. Drink plenty of water.",
  "பருப்பு, முட்டை, பால் போன்ற புரதம் நிறைந்த உணவை சாப்பிடுங்கள். நிறைய தண்ணீர் குடியுங்கள்.",
  "दाल, अंडे और दूध जैसा प्रोटीन वाला खाना खाएं। खूब पानी पिएं।"),
 ("Fever above", "warning_sign", "Fever or wound problem", None, None, .95, True,
  "Fever above 100.4 F, or redness, pus, or swelling at the wound, are warning signs.",
  "100.4 F க்கு மேல் காய்ச்சல், அல்லது காயத்தில் சிவப்பு, சீழ், வீக்கம் ஆகியவை எச்சரிக்கை அறிகுறிகள்.",
  "100.4 F से ऊपर बुखार, या घाव पर लालिमा, मवाद या सूजन चेतावनी के संकेत हैं।"),
 ("Calf pain", "warning_sign", "Calf pain or breathlessness", None, None, .95, True,
  "Calf pain, swelling of the leg, or sudden shortness of breath are warning signs.",
  "கெண்டைக்கால் வலி, காலில் வீக்கம் அல்லது திடீர் மூச்சுத் திணறல் ஆகியவை எச்சரிக்கை அறிகுறிகள்.",
  "पिंडली में दर्द, पैर में सूजन या अचानक सांस फूलना चेतावनी के संकेत हैं।"),
],
"c": [
 ("Metformin", M, "Metformin 500 mg", None, "morning,night", .96, False,
  "Take Metformin 500 mg twice a day, after breakfast and after dinner.",
  "Metformin 500 mg மாத்திரையை தினமும் இரண்டு முறை, காலை உணவுக்கும் இரவு உணவுக்கும் பிறகு சாப்பிடவும்.",
  "Metformin 500 mg की गोली दिन में दो बार, नाश्ते और रात के खाने के बाद लें।"),
 ("Glimepiride", M, "Glimepiride 1 mg", None, "morning", .96, False,
  "Take Glimepiride 1 mg once a day in the morning, before breakfast.",
  "Glimepiride 1 mg மாத்திரையை தினமும் ஒரு முறை காலையில் காலை உணவுக்கு முன் சாப்பிடவும்.",
  "Glimepiride 1 mg की गोली दिन में एक बार सुबह नाश्ते से पहले लें।"),
 ("Insulin glargine", M, "Insulin glargine 10 units", None, "night", .93, True,
  "Insulin glargine 10 units under the skin once a day at night. This is a new medicine.",
  "Insulin glargine 10 units தோலுக்கு அடியில் தினமும் ஒரு முறை இரவில். இது ஒரு புதிய மருந்து.",
  "Insulin glargine 10 units त्वचा के नीचे दिन में एक बार रात को। यह नई दवा है।"),
 ("Atorvastatin", M, "Atorvastatin 10 mg", None, "night", .96, False,
  "Take Atorvastatin 10 mg once a day at night.",
  "Atorvastatin 10 mg மாத்திரையை தினமும் ஒரு முறை இரவில் சாப்பிடவும்.",
  "Atorvastatin 10 mg की गोली दिन में एक बार रात को लें।"),
 ("Check blood sugar before breakfast", "other", "Daily sugar check", None, "morning,night", .93, False,
  "Check your blood sugar before breakfast and at bedtime every day. Write it in the diary.",
  "தினமும் காலை உணவுக்கு முன்பும் படுக்கும் முன்பும் இரத்த சர்க்கரையை பரிசோதிக்கவும். அதை டைரியில் எழுதவும்.",
  "रोज़ नाश्ते से पहले और सोने से पहले ब्लड शुगर जांचें। इसे डायरी में लिखें।"),
 ("nurse trained", "other", "Insulin injection", None, None, .9, False,
  "The nurse trained your family to give the insulin injection. Change the injection site every day.",
  "செவிலியர் உங்கள் குடும்பத்திற்கு இன்சுலின் ஊசி போடக் கற்றுக் கொடுத்தார். ஒவ்வொரு நாளும் ஊசி போடும் இடத்தை மாற்றவும்.",
  "नर्स ने आपके परिवार को इंसुलिन इंजेक्शन लगाना सिखाया। हर दिन इंजेक्शन की जगह बदलें।"),
 ("Review with the diabetologist", "appointment", "Diabetes doctor visit", "after 1 week", None, .94, False,
  "See the diabetes doctor (diabetologist) at Marina Medical Centre after 1 week. Bring your sugar diary.",
  "1 வாரத்திற்குப் பிறகு Marina Medical Centre-இல் நீரிழிவு மருத்துவரைப் (diabetologist) பார்க்கவும். சர்க்கரை டைரியை எடுத்துச் செல்லவும்.",
  "1 सप्ताह बाद Marina Medical Centre में मधुमेह डॉक्टर (diabetologist) से मिलें। शुगर डायरी साथ लाएं।"),
 ("HbA1c", "test", "HbA1c and kidney tests", "after 3 months", None, .93, False,
  "Get the HbA1c and kidney function blood tests after 3 months.",
  "3 மாதங்களுக்குப் பிறகு HbA1c மற்றும் சிறுநீரக செயல்பாட்டு இரத்த பரிசோதனைகள் செய்யவும்.",
  "3 महीने बाद HbA1c और किडनी की कार्यक्षमता की जांच कराएं।"),
 ("eye specialist", "referral", "Eye check (retina)", "within 1 month", None, .92, False,
  "You are referred to an eye specialist for a retina check within 1 month.",
  "1 மாதத்திற்குள் விழித்திரை பரிசோதனைக்காக கண் மருத்துவரிடம் அனுப்பப்பட்டுள்ளீர்கள்.",
  "आपको 1 महीने के भीतर रेटिना जांच के लिए नेत्र रोग विशेषज्ञ के पास भेजा गया है।"),
 ("Referred to a dietician", "referral", "Dietician visit", "20 Oct 2026", None, .94, False,
  "You are referred to a dietician for a diabetic diet plan on 20 October 2026.",
  "20 அக்டோபர் 2026 அன்று நீரிழிவு உணவுத் திட்டத்திற்காக உணவு நிபுணரிடம் (dietician) அனுப்பப்பட்டுள்ளீர்கள்.",
  "आपको 20 अक्टूबर 2026 को मधुमेह आहार योजना के लिए आहार विशेषज्ञ (dietician) के पास भेजा गया है।"),
 ("small meals", "diet", "Small, regular meals", None, None, .92, False,
  "Eat small meals every 3 to 4 hours. Avoid sugar, sweets, and sweetened drinks.",
  "ஒவ்வொரு 3 முதல் 4 மணி நேரத்திற்கும் சிறிய உணவுகளை சாப்பிடுங்கள். சர்க்கரை, இனிப்புகள், இனிப்பு பானங்களைத் தவிர்க்கவும்.",
  "हर 3 से 4 घंटे में थोड़ा-थोड़ा खाएं। चीनी, मिठाई और मीठे पेय से बचें।"),
 ("Include vegetables", "diet", "Vegetables, dal and whole grains", None, None, .92, False,
  "Include vegetables, dal, and whole grains in each meal.",
  "ஒவ்வொரு வேளை உணவிலும் காய்கறிகள், பருப்பு, முழு தானியங்களைச் சேர்த்துக் கொள்ளுங்கள்.",
  "हर भोजन में सब्ज़ियां, दाल और साबुत अनाज शामिल करें।"),
 ("Walk for 30 minutes", "activity", "Daily walk", None, None, .92, False,
  "Walk for 30 minutes every day after dinner.",
  "தினமும் இரவு உணவுக்குப் பிறகு 30 நிமிடங்கள் நடக்கவும்.",
  "हर दिन रात के खाने के बाद 30 मिनट चलें।"),
 ("Sweating, shaking", "warning_sign", "Signs of low blood sugar", None, None, .95, True,
  "Sweating, shaking, hunger, or confusion can mean low blood sugar. Call your doctor at once.",
  "வியர்வை, நடுக்கம், பசி அல்லது குழப்பம் குறைந்த இரத்த சர்க்கரையைக் குறிக்கலாம். உடனே உங்கள் மருத்துவரை அழைக்கவும்.",
  "पसीना, कांपना, भूख या भ्रम कम ब्लड शुगर का संकेत हो सकता है। तुरंत अपने डॉक्टर को कॉल करें।"),
 ("above 300", "warning_sign", "High blood sugar", None, None, .95, True,
  "If your blood sugar is above 300 mg/dl on two readings, call your doctor.",
  "இரண்டு அளவீடுகளிலும் இரத்த சர்க்கரை 300 mg/dl க்கு மேல் இருந்தால் உங்கள் மருத்துவரை அழைக்கவும்.",
  "लगातार दो रीडिंग में ब्लड शुगर 300 mg/dl से ऊपर हो तो अपने डॉक्टर को कॉल करें।"),
],
"d": [
 ("Amlodipine", M, "Amlodipine 5 mg", None, "morning", .8, True,
  "Amlodipine 5 mg once a day in the morning. The note says the dose may go up to 10 mg if BP stays high.",
  "Amlodipine 5 mg தினமும் ஒரு முறை காலையில். BP அதிகமாக இருந்தால் மருந்தளவு 10 mg ஆக உயரலாம் என்று குறிப்பு கூறுகிறது.",
  "Amlodipine 5 mg दिन में एक बार सुबह। नोट कहता है कि BP ज़्यादा रहे तो खुराक 10 mg तक बढ़ सकती है।"),
 ("Azithromycin", M, "Azithromycin 500 mg", None, "morning", .85, True,
  "Azithromycin 500 mg once a day for 3 days. The note says to stop when better.",
  "Azithromycin 500 mg தினமும் ஒரு முறை, 3 நாட்களுக்கு. நன்றாக ஆனதும் நிறுத்தலாம் என்று குறிப்பு கூறுகிறது.",
  "Azithromycin 500 mg दिन में एक बार, 3 दिन तक। नोट कहता है कि ठीक होने पर बंद करें।"),
 ("Cough syrup", M, "Cough syrup 10 ml", None, None, .8, True,
  "Cough syrup 10 ml as needed for cough.",
  "இருமலுக்கு தேவைப்பட்டால் இருமல் மருந்து 10 ml.",
  "खांसी के लिए ज़रूरत पड़ने पर खांसी की दवा 10 ml।"),
 ("Tab Paracetamol", M, "Paracetamol 650 mg", None, None, .8, True,
  "Paracetamol 650 mg if required for fever.",
  "காய்ச்சலுக்கு தேவைப்பட்டால் Paracetamol 650 mg.",
  "बुखार के लिए ज़रूरत पड़ने पर Paracetamol 650 mg।"),
 ("Stop the old BP", M, "Old BP tablet", None, "morning", .75, True,
  "One line says to stop the old BP tablet. The next line says to continue it in the morning.",
  "பழைய BP மாத்திரையை நிறுத்த வேண்டும் என்று ஒரு வரி கூறுகிறது. அடுத்த வரி காலையில் தொடர வேண்டும் என்று கூறுகிறது.",
  "एक पंक्ति पुरानी BP गोली बंद करने को कहती है। अगली पंक्ति इसे सुबह जारी रखने को कहती है।"),
 ("Pantoprazole", M, "Pantoprazole 40 mg", None, "morning", .95, False,
  "Take Pantoprazole 40 mg once a day in the morning, before food.",
  "Pantoprazole 40 mg மாத்திரையை தினமும் ஒரு முறை காலையில் உணவுக்கு முன் சாப்பிடவும்.",
  "Pantoprazole 40 mg की गोली दिन में एक बार सुबह खाने से पहले लें।"),
 ("See Dr. Mehta", "appointment", "Visit Dr. Mehta (physician)", "on 20 Oct 2026", None, .95, False,
  "See Dr. Mehta, the physician, at Green Leaf Hospital on 20 October 2026.",
  "20 அக்டோபர் 2026 அன்று Green Leaf Hospital-இல் மருத்துவர் Mehta (physician) அவர்களைப் பார்க்கவும்.",
  "20 अक्टूबर 2026 को Green Leaf Hospital में डॉ. Mehta (physician) से मिलें।"),
 ("sometime next week", "appointment", "Review visit", "sometime next week", None, .7, True,
  "Come for a review sometime next week. The exact day is not given.",
  "அடுத்த வாரத்தில் ஏதாவது ஒரு நாள் மறுபரிசோதனைக்கு வரவும். சரியான நாள் கொடுக்கப்படவில்லை.",
  "अगले सप्ताह किसी दिन जांच के लिए आएं। सटीक दिन नहीं दिया गया है।"),
 ("Chest X-ray", "test", "Chest X-ray", "date to be decided", None, .6, True,
  "A chest X-ray is to be done. The date is still to be decided.",
  "மார்பு X-ray எடுக்க வேண்டும். தேதி இன்னும் முடிவு செய்யப்படவில்லை.",
  "छाती का X-ray कराना है। तारीख अभी तय नहीं है।"),
 ("chest specialist", "appointment", "Chest specialist review", "after the reports", None, .55, True,
  "Review with the chest specialist after the reports are ready.",
  "அறிக்கைகள் தயாரான பிறகு நெஞ்சு மருத்துவ நிபுணரிடம் மறுபரிசோதனை செய்யவும்.",
  "रिपोर्ट आने के बाद छाती रोग विशेषज्ञ से जांच कराएं।"),
 ("kidney function", "test", "Kidney function blood test", "when the doctor advises", None, .6, True,
  "A blood test for kidney function is planned. The doctor will say when.",
  "சிறுநீரக செயல்பாட்டிற்கான இரத்த பரிசோதனை திட்டமிடப்பட்டுள்ளது. எப்போது என்று மருத்துவர் கூறுவார்.",
  "किडनी की कार्यक्षमता की खून जांच तय है। कब कराना है, डॉक्टर बताएंगे।"),
 ("Refer to a dietician", "referral", "Dietician", "as needed", None, .6, True,
  "A visit to a dietician is mentioned, as needed.",
  "தேவைப்பட்டால் உணவு நிபுணரைப் (dietician) பார்க்க வேண்டும் என்று குறிப்பிடப்பட்டுள்ளது.",
  "ज़रूरत पड़ने पर आहार विशेषज्ञ (dietician) से मिलने का उल्लेख है।"),
 ("Rest at home", "activity", "Rest at home", None, None, .7, True,
  "Rest at home. The note says activity can be adjusted as per comfort.",
  "வீட்டில் ஓய்வெடுக்கவும். வசதிக்கு ஏற்ப செயல்பாட்டை மாற்றிக்கொள்ளலாம் என்று குறிப்பு கூறுகிறது.",
  "घर पर आराम करें। नोट कहता है कि आराम के अनुसार गतिविधि बदली जा सकती है।"),
 ("Avoid salt", "diet", "Avoid salt", None, None, .9, False,
  "Avoid salt in food.",
  "உணவில் உப்பைத் தவிர்க்கவும்.",
  "खाने में नमक से बचें।"),
 ("Drink plenty of fluids", "diet", "Fluids", None, None, .75, True,
  "One line says to drink plenty of fluids and also to restrict fluids if there is leg swelling.",
  "நிறைய திரவங்கள் குடிக்க வேண்டும் என்றும், கால் வீக்கம் இருந்தால் திரவங்களைக் கட்டுப்படுத்த வேண்டும் என்றும் ஒரு வரி கூறுகிறது.",
  "एक पंक्ति खूब तरल पीने को कहती है और पैर में सूजन हो तो तरल सीमित करने को भी कहती है।"),
 ("Fever returning", "warning_sign", "Fever, fast breathing, bluish lips", None, None, .95, True,
  "Fever returning, fast breathing, or bluish lips are warning signs.",
  "மீண்டும் காய்ச்சல், வேகமான சுவாசம் அல்லது உதடுகள் நீல நிறமாதல் ஆகியவை எச்சரிக்கை அறிகுறிகள்.",
  "बुखार का लौटना, तेज़ सांस या होंठ नीले पड़ना चेतावनी के संकेत हैं।"),
 ("very dizzy", "warning_sign", "Dizziness or confusion", None, None, .95, True,
  "Feeling very dizzy or confused is a warning sign.",
  "மிகவும் தலைசுற்றல் அல்லது குழப்பம் எச்சரிக்கை அறிகுறி.",
  "बहुत चक्कर आना या भ्रम चेतावनी का संकेत है।"),
],
}


import extra_samples  # noqa: E402  (e to h: stroke, COPD, appendectomy, pneumonia)

TEXT.update(extra_samples.TEXT)
META.extend(extra_samples.META)
ITEMS.update(extra_samples.ITEMS)


def build_samples_and_fixtures():
    (D / "samples").mkdir(exist_ok=True)
    (D / "fixtures").mkdir(exist_ok=True)
    for m in META:
        (D / "samples" / m["file"]).write_text(TEXT[m["key"]], encoding="utf-8")
    (D / "samples" / "index.json").write_text(json.dumps(META, indent=2, ensure_ascii=False), encoding="utf-8")
    for key, specs in ITEMS.items():
        lines = to_lines(TEXT[key])
        out = []
        for find, cat, title, date_raw, tod, conf, review, en, ta, hi in specs:
            hits = [(n, t) for n, t in lines if find in t]
            assert len(hits) == 1, (key, find, hits)
            n, t = hits[0]
            out.append({"category": cat, "title": title, "original_text": t, "source_line_numbers": [n],
                        "date_raw": date_raw, "time_of_day": tod, "confidence": conf,
                        "expect_review": review, "simple": {"en": en, "ta": ta, "hi": hi}})
        (D / "fixtures" / f"{key}.json").write_text(json.dumps({"items": out}, indent=2, ensure_ascii=False), encoding="utf-8")


def build_pdf():
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    path = D / "samples" / "b_knee_replacement.pdf"
    c = canvas.Canvas(str(path), pagesize=A4)
    y = 800
    for _, line in to_lines(TEXT["b"]):
        c.setFont("Helvetica-Bold" if line.isupper() else "Helvetica", 10)
        c.drawString(40, y, line[:110])
        y -= 16
    c.save()


# ---- providers ----
AREAS = {
    "Chennai": [("600017", 13.0418, 80.2341), ("600020", 13.0012, 80.2565), ("600040", 13.0850, 80.2101),
                ("600042", 12.9815, 80.2180), ("600004", 13.0368, 80.2676), ("600045", 12.9249, 80.1000),
                ("600032", 13.0067, 80.2206), ("600010", 13.0827, 80.2420)],
    "Bengaluru": [("560001", 12.9763, 77.6033), ("560034", 12.9352, 77.6245), ("560066", 12.9698, 77.7500),
                  ("560038", 12.9784, 77.6408), ("560011", 12.9250, 77.5938), ("560078", 12.9063, 77.5857)],
    "Hyderabad": [("500001", 17.3850, 78.4867), ("500034", 17.4126, 78.4071), ("500081", 17.4435, 78.3772),
                  ("500016", 17.4375, 78.4483), ("500032", 17.4401, 78.3489), ("500020", 17.4065, 78.4772)],
    "Kochi": [("682001", 9.9312, 76.2673), ("682016", 9.9816, 76.2999), ("682020", 9.9674, 76.2441),
              ("682024", 10.0159, 76.3419), ("682030", 9.9252, 76.3180), ("682036", 9.9400, 76.2800)],
    "Delhi": [("110001", 28.6315, 77.2167), ("110024", 28.5677, 77.2433), ("110075", 28.5921, 77.0460),
              ("110085", 28.7495, 77.0565), ("110017", 28.5245, 77.2066), ("110005", 28.6519, 77.1909),
              ("110070", 28.5200, 77.1590), ("110058", 28.6219, 77.0878)],
}
PREFIX = ["Lotus", "Palm", "Kaveri", "Banyan", "Amber", "Jasmine", "Neem", "Coral", "Sandal", "Mango",
          "Peacock", "Ashoka", "Tulsi", "Maple", "Willow", "Saffron", "Teak", "Orchid", "Harmony", "Pearl",
          "Silver Oak", "Blue Lotus", "Green Valley", "Riverside", "Hillview", "Sunrise", "Dawn", "Cedar",
          "Aster", "Lily"]
TEMPLATES = [
    ("hospital", "General Hospital", "cardiology;orthopaedics;general medicine;pulmonology;diabetology"),
    ("hospital", "Heart Centre", "cardiology;cardiac rehabilitation;cardiac diagnostics"),
    ("clinic", "Diabetes Clinic", "diabetology;endocrinology;dietetics"),
    ("clinic", "Eye Care Clinic", "ophthalmology"),
    ("clinic", "Bone and Joint Clinic", "orthopaedics"),
    ("lab", "Diagnostics Lab", "pathology;radiology;cardiac diagnostics"),
    ("lab", "Scan and Lab Centre", "radiology;pathology"),
    ("physio", "Physiotherapy Centre", "physiotherapy;orthopaedic rehabilitation;cardiac rehabilitation"),
    ("pharmacy", "Medicals", "pharmacy"),
    ("home_care", "Home Care Services", "home nursing;wound care"),
]


def build_providers():
    rnd = random.Random(7)
    rows, n = [], 0
    for city, areas in AREAS.items():
        for rep in range(3):
            for kind, suffix, specs in TEMPLATES:
                pin, lat, lng = areas[(n * 3 + rep) % len(areas)]
                langs = ["en;ta;hi", "en;ta", "en;ta;hi"][n % 3] if city == "Chennai" else ["en;te", "en;te;hi"][n % 2] if city == "Hyderabad" else ["en;kn", "en;kn;ta"][n % 2] if city == "Bengaluru" else ["en;ml", "en;ml;ta"][n % 2] if city == "Kochi" else ["en;hi", "en;hi;ta", "en;hi"][n % 3]
                if kind == "clinic" and "dietetics" in specs and rep == 1:
                    specs += ";general medicine"
                if kind == "clinic" and "ophthalmology" in specs and rep == 2:
                    specs = "ophthalmology;dietetics"
                if kind == "clinic" and "dietetics" in specs and rep == 2:
                    specs += ";pulmonology"
                rows.append({
                    "name": f"{PREFIX[n % len(PREFIX)]} {suffix}", "type": kind, "specialties": specs, "city": city,
                    "pincode": pin, "lat": round(lat + rnd.uniform(-.012, .012), 5), "lng": round(lng + rnd.uniform(-.012, .012), 5),
                    "languages": langs, "insurance": ["Ayushman Bharat;CGHS;Private", "CGHS;Private", "Ayushman Bharat;Private"][n % 3],
                    "open_days": ["Mon-Sat", "Mon-Sun", "Mon-Fri", "Mon-Sat"][n % 4],
                    "phone": ({"Chennai": "044-5550-", "Delhi": "011-5550-", "Bengaluru": "080-5550-", "Hyderabad": "040-5550-", "Kochi": "0484-5550-"}[city]) + f"{100 + n:04d}"[-4:],
                    "synthetic": "true"})
                n += 1
    with open(D / "providers.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    build_samples_and_fixtures()
    build_pdf()
    print("providers:", build_providers())
