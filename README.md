# LectureUploaderApp

تطبيق ويب لرفع واستعراض محاضرات للطلاب والمعلمين مع دعم RTL وحفظ ملفات على القرص.

## المزايا
- دخول طلاب/معلمين ومالك للنظام.
- رفع محاضرات وملفات ملخصات وإدارتها.
- تعليقات وإعجابات وإحصاءات مشاهدة/تنزيل.
- ملفات شخصية للطلاب (Student files).
- تصنيفات حسب المادة والقسم والنوع.
- إشعارات إدارية (داخلية) للمعلمين.

## التقنية المستخدمة
- Node.js + Express (Backend)
- واجهة أمامية ثابتة داخل مجلد public
- تخزين JSON بسيط في server/db.json
- رفع ملفات إلى uploads

## تشغيل محليًا
1. تثبيت الاعتمادات:
`ash
npm install
`
2. التشغيل:
`ash
npm start
`
- الخادم يعمل على http://localhost:3000
- الواجهة الأمامية تُقدّم من مجلد public

## المتغيرات البيئية
- PORT (افتراضي 3000)
- JWT_SECRET مفتاح JWT
- TEACHER_SECRET سر المعلم/المالك
- OWNER_USERNAME اسم المستخدم للمالك (يُنشأ تلقائيًا إن لم يوجد)

يمكن ضبطها من بيئة التشغيل أو قبل التشغيل مثلًا:
`ash
set PORT=3000
set JWT_SECRET=your-secret
set TEACHER_SECRET=your-teacher-secret
set OWNER_USERNAME=مالك
npm start
`

## التخزين والملفات
- مرفوعات المحاضرات: uploads/lectures
- ملفات الطلاب: uploads/students/<username>
- قاعدة البيانات JSON: server/db.json

إذا نشرت على خدمة سحابية، وفّر تخزين دائم (Volume) واربط:
- uploads إلى مسار دائم
- server/db.json إلى ملف دائم

## هيكل المشروع
`
LectureUploaderApp/
  public/
    index.html, teacher.html, ...
  server/
    server.js
    db.js
    db.json (runtime)
  uploads/ (runtime)
  package.json
`

## سكربتات npm
- 
pm start: تشغيل الخادم server/server.js
- 
pm run dev: تشغيل مع nodemon (محليًا)

## المساهمة
- أنشئ فرعًا جديدًا للتطوير:
`ash
git checkout -b feature/my-change
`
- بعد الانتهاء:
`ash
git add -A
git commit -m "وصف التعديل"
git push -u origin feature/my-change
`
ثم افتح Pull Request.

## الرخصة
أضف ملف LICENSE لاختيار رخصة مناسبة (مثل MIT/Apache-2.0).
