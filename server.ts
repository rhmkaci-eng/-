import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// The custom API key provided by the user (Tier 1 enabled)
const CUSTOM_API_KEY = "AIzaSyDy-Zso8dKXmjYR1QfwNeBepGe8tLyJjM4";
const ai = new GoogleGenAI({ apiKey: CUSTOM_API_KEY });

// Global state for rate limiting (20 images per day)
let imageCount = 0;
let lastResetDate = new Date().toDateString();

function checkAndResetLimit() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    imageCount = 0;
    lastResetDate = today;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API route for text generation
  app.post("/api/generate-text", async (req, res) => {
    try {
      const { input, gregorianDate, hijriDate } = req.body;
      
      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          # Role
          أنت "المسؤول الإعلامي الذكي" لنادي "جسور" الطلابي في كلية العلوم الإسلامية (جامعة الجزائر 1).
          مهمتك هي استلام نص (أو بيانات) وتحليلها، ثم كتابة "وصف نصي" (Caption) جاهز للنشر.

          # Context
          تاريخ اليوم هو: الميلادي ${gregorianDate}، والهجري ${hijriDate}. استخدم هذا كمرجع دقيق لحساب أي تواريخ مذكورة في النص.

          # Skills
          1. تحليل دقيق: استخراج النصوص (العناوين، التواريخ، الأسماء) بدقة.
          2. الصدق في النقل: عدم اختراع معلومات غير موجودة، خاصة "المحاور".
          3. التنبيه الذكي: تنبيه المستخدم (عضو النادي) لإكمال النواقص.

          # Constraints (قيود صارمة)
          - التاريخ الهجري: إذا لم يكن مكتوباً، قم بتحويله حسابياً بناءً على تاريخ اليوم المرجعي أعلاه.
          - المحاور (العناوين):
            1. إذا كانت مكتوبة: استخرجها واكتبها كنقاط.
            2. إذا لم تكن مكتوبة: توقف! لا تجتهد ولا تؤلف من عندك. اترك مكانها فارغاً مع عبارة واضحة تطلب من العضو كتابتها (كما في القالب أدناه).
          - المعلومات المفقودة: إذا لم تجد معلومة (مثل المكان)، اترك مكانها فارغاً بين قوسين هكذا: (يرجى تحديد المكان).
          - الخاتمة: اختر العبارة الختامية بناءً على نوع المنشور (إعلان أو تذكير) كما هو موضح في القالب.

          # Workflow
          1. حلل النص واستخرج البيانات.
          2. حدد نوع المنشور (إعلان/تذكير).
          3. قم بتوليد **نسختين (2) مختلفتين تماماً** من المنشور (يجب أن يكون الفرق بينهما واضحاً جداً في النبرة والكلمات):
             - **الخيار الأول (الأسلوب الرسمي/الأكاديمي):** 
               * النبرة: جدية، وقورة، تليق بمقام العلم والعلماء.
               * المفردات: استخدم كلمات مثل "يتشرف"، "يدعو"، "مجلس علمي"، "تأصيل".
               * البداية: ابدأ بـ "يسر نادي جسور..." أو "في إطار الأنشطة العلمية...".
             - **الخيار الثاني (الأسلوب التفاعلي/الشبابي/الودي):** 
               * النبرة: حماسية، قريبة من القلب، تخاطب الطالب كصديق.
               * المفردات: استخدم كلمات مثل "يا شباب"، "فرصة لا تعوض"، "لا تفوتوا"، "موعدنا".
               * البداية: ابدأ بسؤال مثير أو نداء مثل "هل تبحث عن..." أو "يا باغي الخير...".
          4. املأ القالب أدناه بدقة لكل نسخة.

          ---
          ## القالب المطلوب (اكتبه حرفياً بدون إضافات أخرى):

          🌟 [عنوان النشاط بخط عريض] 🌟

          [الجملة الافتتاحية - يجب أن تكون مختلفة تماماً بين الخيارين حسب الأسلوب]

          📌 تفاصيل الموعد:
          🗓 التاريخ: [اليوم] الموافق [التاريخ الميلادي] | [التاريخ الهجري]
          ⏰ التوقيت: [الساعة]
          📍 المكان: [المكان بدقة]
          🎤 من تقديم: [اسم الضيف/المدرب إن وجد]

          💡 لماذا تحضر؟ (أبرز المحاور):
          - [محور 1]
          - [محور 2]
          (🔴 تنبيه: لم أجد محاور في النص، يرجى كتابة أبرز العناوين أو النقاط هنا يدوياً ليعرف الطالب ماذا سيستفيد)

          🔗 رابط القناة: (يضاف لاحقاً)

          [منطق الخاتمة - اختر واحدة فقط بناء على نوع المنشور]:
          - إعلان عام: 📢 حضوركم يشرفنا ويدعم مسيرتكم!
          - تذكير: كونوا في الموعد! 🌾

          ---
          🔴 تذكير أخير للمشرف:
          1. انسخ "القالب الختامي" (الهاشتاجات) من التليجرام وألصقه هنا.
          2. أكمل المحاور الناقصة أعلاه (مهم جداً لجذب الطلاب).
          3. تأكد من صحة التاريخ.

          ---
          3. بالإضافة إلى ذلك، اكتب وصفاً باللغة الإنجليزية (Prompt) لتوليد صورة الإعلان. الوصف يجب أن يطلب تصميم إسلامي أكاديمي فخم بألوان الذهبي والأسود والأبيض.
          يجب أن تطلب بوضوح في الوصف (Prompt) أن تتضمن الصورة النصوص والعناصر التالية فقط:
          - عنوان المجلس بخط عربي جميل وبارز في المنتصف.
          - اسم الأستاذ بخط عربي.
          - التاريخ والوقت والمكان بتنسيق عربي. **مهم جداً:** يجب أن تسبق التواريخ والأوقات والأماكن بكلمات توضيحية وإيموجي (مثلاً: 📅 التاريخ: 03/03/2026، ⏰ الساعة: 13:15، 📍 القاعة: مقر النادي).
          - **مهم جداً:** استخدم الأرقام المعتادة (0, 1, 2, 3...) واكتبها من اليمين إلى اليسار.
          - أيقونات تواصل اجتماعي (فيسبوك، انستغرام، تليجرام) مع عبارة "نادي جسور" في الزاوية السفلية اليسرى (Bottom Left) كتوقيع.
          - **مهم جداً:** اطلب دمج الشعارات المرفقة (Reference logos) بشكل إبداعي وأنيق. حدد بوضوح تام أن شعار "نحو أفق الفكر والمعرفة" (Slogan logo) يجب أن يكون في **أعلى المنتصف تماماً (Top Center)**، بينما توزع الشعارات الأخرى (الكلية والنادي) في الزوايا العلوية (Top Left & Top Right) بشكل متناسق.
          - لا تضف أي نصوص باللغة الإنجليزية (No English text).
          - لا تضع صور أشخاص.
          - التصميم يجب أن يكون مربعاً (Square 1:1 aspect ratio).
          
          النص المدخل:
          ${input}
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              postText1: {
                type: Type.STRING,
                description: 'The first variation of the formatted Telegram post in Arabic.',
              },
              postText2: {
                type: Type.STRING,
                description: 'The second variation of the formatted Telegram post in Arabic.',
              },
              imagePrompt: {
                type: Type.STRING,
                description: 'The English prompt for the image generation model.',
              },
            },
            required: ['postText1', 'postText2', 'imagePrompt'],
          },
        },
      });
      
      const jsonStr = textResponse.text?.trim() || '{}';
      res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // API route for image generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      checkAndResetLimit();
      if (imageCount >= 20) {
        return res.status(429).json({ error: "عذراً، لقد تم الوصول للحد الأقصى اليومي لتوليد الصور (20 صورة). يرجى المحاولة غداً." });
      }

      const { prompt, model, baseImage, logos } = req.body;
      
      let parts: any[] = [];

      if (baseImage) {
        // baseImage is expected to be a data URL: data:image/png;base64,...
        const mimeType = baseImage.split(';')[0].split(':')[1];
        const data = baseImage.split(',')[1];
        parts.push({ inlineData: { data, mimeType } });
      }

      if (logos) {
        const addLogo = (logoDataUrl: string) => {
          if (!logoDataUrl) return;
          const mimeType = logoDataUrl.split(';')[0].split(':')[1];
          const data = logoDataUrl.split(',')[1];
          parts.push({ inlineData: { data, mimeType } });
        };
        addLogo(logos.club);
        addLogo(logos.college);
        addLogo(logos.slogan);
      }

      parts.push({ text: prompt });

      const contents = { parts };

      const imageResponse = await ai.models.generateContent({
        model: model,
        contents: contents,
      });

      let imageUrl = '';
      if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        throw new Error('فشل توليد الصورة.');
      }

      // Increment count on success
      imageCount++;

      res.json({ image: imageUrl, remaining: 20 - imageCount });
    } catch (error: any) {
      console.error(error);
      if (error.status === 403 || error.message?.includes("PERMISSION_DENIED")) {
        return res.status(403).json({ error: "مفتاح API الخاص بك لا يملك الصلاحيات الكافية لاستخدام هذا النموذج. تأكد من أن المفتاح مرتبط بمشروع Google Cloud مدفوع." });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // API route for remaining limit
  app.get("/api/limit", (req, res) => {
    checkAndResetLimit();
    res.json({ remaining: 20 - imageCount });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
