import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Copy, CheckCircle2, Image as ImageIcon, Send, Upload, Trash2, Download, Settings, Edit3 } from 'lucide-react';

declare global {
  var puter: any;
}

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ image: string; text1: string; text2: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [imageModel, setImageModel] = useState('gemini-3.1-flash-image-preview');
  const [activeTab, setActiveTab] = useState<'text1' | 'text2'>('text1');

  // Logos state
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [collegeLogo, setCollegeLogo] = useState<string | null>(null);

  useEffect(() => {
    // Load logos from local storage on mount
    setClubLogo(localStorage.getItem('clubLogo'));
    setCollegeLogo(localStorage.getItem('collegeLogo'));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'club' | 'college') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'club') {
          setClubLogo(base64);
          localStorage.setItem('clubLogo', base64);
        } else {
          setCollegeLogo(base64);
          localStorage.setItem('collegeLogo', base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (type: 'club' | 'college') => {
    if (type === 'club') {
      setClubLogo(null);
      localStorage.removeItem('clubLogo');
    } else {
      setCollegeLogo(null);
      localStorage.removeItem('collegeLogo');
    }
  };

  const compositeImage = async (baseImage: string | HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const drawLogosAndResolve = async (img: HTMLImageElement) => {
        canvas.width = img.width || 1024;
        canvas.height = img.height || 1024;
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const logoSize = Math.min(canvas.width, canvas.height) * 0.15; // 15% of image size
        const padding = logoSize * 0.3;

        const drawLogo = (logoUrl: string, x: number, y: number) => {
          return new Promise<void>((res) => {
            const logoImg = new Image();
            logoImg.onload = () => {
              if (ctx) {
                // Draw with a slight shadow for better visibility
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 15;
                ctx.drawImage(logoImg, x, y, logoSize, logoSize);
                ctx.shadowColor = 'transparent';
              }
              res();
            };
            logoImg.onerror = () => res();
            logoImg.src = logoUrl;
          });
        };

        // Draw College Logo on Top Right
        if (collegeLogo) {
          await drawLogo(collegeLogo, canvas.width - logoSize - padding, padding);
        }
        
        // Draw Club Logo on Top Left
        if (clubLogo) {
          await drawLogo(clubLogo, padding, padding);
        }

        resolve(canvas.toDataURL('image/png'));
      };

      if (typeof baseImage === 'string') {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => drawLogosAndResolve(img);
        img.onerror = () => resolve(baseImage);
        img.src = baseImage;
      } else {
        // It's an HTMLImageElement from Puter
        if (baseImage.complete) {
          drawLogosAndResolve(baseImage);
        } else {
          baseImage.onload = () => drawLogosAndResolve(baseImage);
          baseImage.onerror = () => resolve('');
        }
      }
    });
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    setActiveTab('text1');

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const today = new Date();
      const gregorianDate = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day: 'numeric', month: 'long', year: 'numeric'}).format(today);

      // Step 1: Process Text and Generate Post + Image Prompt
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
          3. قم بتوليد **نسختين (2)** من المنشور (وصفين مختلفين قليلاً في الجملة الافتتاحية والأسلوب) ليختار المستخدم بينهما.
          4. املأ القالب أدناه بدقة لكل نسخة.

          ---
          ## القالب المطلوب (اكتبه حرفياً بدون إضافات أخرى):

          🌟 [عنوان النشاط بخط عريض] 🌟

          يسر نادي جسور أن [اكتب هنا جملة فعلية جذابة ومختصرة تدعو للمشاركة - نوّع فيها بين النسختين]

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
          3. بالإضافة إلى ذلك، اكتب وصفاً باللغة الإنجليزية (Prompt) لتوليد صورة الإعلان. الوصف يجب أن يطلب تصميم إسلامي أكاديمي فخم بألوان الذهبي والأسود والأبيض، وأن يتضمن عنوان المجلس واسم الأستاذ بخط عربي جميل. لا تضع صور أشخاص. اترك مساحة فارغة في أعلى التصميم لوضع الشعارات.
          
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
      const parsed = JSON.parse(jsonStr);
      const { postText1, postText2, imagePrompt } = parsed;

      // Step 2: Generate Image using Puter.js
      const fullPrompt = imagePrompt + " The design must be elegant, academic, and Islamic. Use gold, black, and white colors. Include Arabic calligraphy style text for the title. No human faces or people. High quality, professional poster. Leave some empty space at the top corners.";
      
      let finalImageUrl = '';
      try {
        const imageElement = await puter.ai.txt2img(fullPrompt, {
          model: imageModel
        });
        
        // Step 3: Composite Logos onto the generated image
        finalImageUrl = await compositeImage(imageElement);
      } catch (puterError) {
        console.error("Puter Error:", puterError);
        throw new Error("فشل توليد الصورة عبر Puter.js. يرجى المحاولة مرة أخرى.");
      }

      setResult({
        image: finalImageUrl,
        text1: postText1,
        text2: postText2,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء التوليد. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (result?.image) {
      const link = document.createElement('a');
      link.href = result.image;
      link.download = 'jusoor_poster.png';
      link.click();
    }
  };

  const activeText = activeTab === 'text1' ? result?.text1 : result?.text2;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (result) {
      setResult({
        ...result,
        [activeTab]: e.target.value
      });
    }
  };

  const handleCopy = () => {
    if (activeText) {
      navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans selection:bg-[#D4AF37]/30 pb-12">
      <header className="bg-[#1a1a1a] text-white py-6 shadow-md border-b-4 border-[#D4AF37]">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          {clubLogo ? (
            <img src={clubLogo} alt="شعار النادي" className="w-12 h-12 object-contain bg-white rounded-full p-1" />
          ) : (
            <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center text-xl font-bold text-[#1a1a1a] shadow-inner">
              ج
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">المساعد الإعلامي</h1>
            <p className="text-[#D4AF37] text-sm mt-1 font-medium tracking-wide">نادي جسور الطلابي - جامعة الجزائر 1</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Logos Setup Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#D4AF37]" />
            إعداد الشعارات (تدمج تلقائياً في التصميم)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* College Logo */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#D4AF37] transition-colors">
              {collegeLogo ? (
                <>
                  <img src={collegeLogo} alt="شعار الكلية" className="h-24 object-contain mb-3" />
                  <button 
                    onClick={() => removeLogo('college')}
                    className="absolute top-2 left-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="حذف الشعار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-green-600">تم رفع شعار الكلية</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/10 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#D4AF37]" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 mb-1">شعار الكلية</span>
                  <span className="text-xs text-gray-400">اضغط للرفع</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleLogoUpload(e, 'college')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>

            {/* Club Logo */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#D4AF37] transition-colors">
              {clubLogo ? (
                <>
                  <img src={clubLogo} alt="شعار النادي" className="h-24 object-contain mb-3" />
                  <button 
                    onClick={() => removeLogo('club')}
                    className="absolute top-2 left-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="حذف الشعار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-green-600">تم رفع شعار النادي</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/10 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#D4AF37]" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 mb-1">شعار النادي</span>
                  <span className="text-xs text-gray-400">اضغط للرفع</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleLogoUpload(e, 'club')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>

          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            * سيتم حفظ الشعارات في متصفحك لاستخدامها في المرات القادمة.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-8">
          <label htmlFor="input-details" className="block text-xl font-semibold mb-2 text-gray-900">
            مرحباً بك أيها الجسوري! أدخل تفاصيل المجلس هنا:
          </label>
          <p className="text-sm text-gray-500 mb-6 font-medium">
            (العنوان، التاريخ، الوقت، المكان، اسم الأستاذ، والمحاور)
          </p>
          <textarea
            id="input-details"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="مثال: مجلس في شرح كتاب التوحيد، يوم الثلاثاء 15 أكتوبر، الساعة 10 صباحاً، في المدرج أ، تقديم الأستاذ أحمد، المحاور: مقدمة، الباب الأول..."
            className="w-full h-40 p-5 rounded-xl border border-gray-200 focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 transition-all resize-none bg-gray-50/50 text-gray-800 text-lg leading-relaxed placeholder:text-gray-400"
          />
          
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#D4AF37]" />
                نموذج الصور:
              </label>
              <select 
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] block p-2.5 outline-none"
              >
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (سريع)</option>
                <option value="gemini-3-pro-image-preview">Nano Banana Pro (جودة أعلى)</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                  جاري المعالجة والتصميم...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-[#D4AF37]" />
                  توليد الإعلان والمنشور
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
              <div className="bg-[#fcfbf9] px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="font-bold text-gray-900 text-lg">الصورة المقترحة</h2>
                </div>
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] hover:text-[#D4AF37] transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow active:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  تحميل التصميم
                </button>
              </div>
              <div className="p-8 flex justify-center bg-gray-50/50">
                <img 
                  src={result.image} 
                  alt="إعلان المجلس" 
                  className="max-w-full h-auto rounded-xl shadow-lg max-h-[600px] object-contain border border-gray-200/50"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
              <div className="bg-[#fcfbf9] px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full"></div>
                  <h2 className="font-bold text-gray-900 text-lg">نص المنشور (قابل للتعديل)</h2>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('text1')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'text1' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    الخيار الأول
                  </button>
                  <button
                    onClick={() => setActiveTab('text2')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'text2' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    الخيار الثاني
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-[#1a1a1a] hover:text-[#D4AF37] transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow active:bg-gray-50"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      نسخ النص
                    </>
                  )}
                </button>
              </div>
              <div className="p-6 relative">
                <div className="absolute top-8 left-8 text-gray-300 pointer-events-none">
                  <Edit3 className="w-5 h-5" />
                </div>
                <textarea
                  value={activeText}
                  onChange={handleTextChange}
                  className="w-full h-96 whitespace-pre-wrap font-sans text-gray-800 leading-relaxed bg-[#fcfbf9] p-6 rounded-xl border border-gray-200/60 text-lg shadow-inner focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 outline-none resize-y"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

