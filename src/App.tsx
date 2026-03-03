import React, { useState, useEffect } from 'react';
import { Loader2, Copy, CheckCircle2, Image as ImageIcon, Send, Upload, Trash2, Download, Settings, Edit3, RefreshCw, Info } from 'lucide-react';

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ image: string; text1: string; text2: string; baseImagePrompt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [imageModel, setImageModel] = useState('gemini-3.1-flash-image-preview');
  const [activeTab, setActiveTab] = useState<'text1' | 'text2'>('text1');
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [remainingImages, setRemainingImages] = useState<number | null>(null);

  // Logos state
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [collegeLogo, setCollegeLogo] = useState<string | null>(null);
  const [sloganLogo, setSloganLogo] = useState<string | null>(null);

  useEffect(() => {
    // Load logos from local storage on mount
    setClubLogo(localStorage.getItem('clubLogo'));
    setCollegeLogo(localStorage.getItem('collegeLogo'));
    setSloganLogo(localStorage.getItem('sloganLogo'));

    // Fetch remaining limit
    fetch('/api/limit')
      .then(res => res.json())
      .then(data => setRemainingImages(data.remaining))
      .catch(err => console.error("Failed to fetch limit", err));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'club' | 'college' | 'slogan') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'club') {
          setClubLogo(base64);
          localStorage.setItem('clubLogo', base64);
        } else if (type === 'college') {
          setCollegeLogo(base64);
          localStorage.setItem('collegeLogo', base64);
        } else {
          setSloganLogo(base64);
          localStorage.setItem('sloganLogo', base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (type: 'club' | 'college' | 'slogan') => {
    if (type === 'club') {
      setClubLogo(null);
      localStorage.removeItem('clubLogo');
    } else if (type === 'college') {
      setCollegeLogo(null);
      localStorage.removeItem('collegeLogo');
    } else {
      setSloganLogo(null);
      localStorage.removeItem('sloganLogo');
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    setActiveTab('text1');

    try {
      const today = new Date();
      const gregorianDate = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day: 'numeric', month: 'long', year: 'numeric'}).format(today);

      // Step 1: Process Text and Generate Post + Image Prompt
      const textRes = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, gregorianDate, hijriDate })
      });

      if (!textRes.ok) {
        const errData = await textRes.json();
        throw new Error(errData.error || 'فشل توليد النص');
      }

      const parsed = await textRes.json();
      const { postText1, postText2, imagePrompt } = parsed;

      // Step 2: Generate Image using Backend API
      const fullPrompt = imagePrompt + " The design must be elegant, academic, and Islamic. Use gold, black, and white colors. Include Arabic calligraphy style text for the title, date, time, and professor name. Add small social media icons (Facebook, Instagram, Telegram) with 'نادي جسور' at the bottom left corner like a signature. Format date and time in Arabic style (Right to Left) using standard digits (0-9). IMPORTANT: Precede dates, times, and locations with emojis and descriptive words (e.g., 📅 التاريخ: 03/03/2026, ⏰ الساعة: 13:15, 📍 القاعة: مقر النادي). STRICTLY NO ENGLISH TEXT. No human faces or people. The image MUST be a perfect square (1:1 aspect ratio). I have provided reference images (logos). Please creatively and elegantly integrate these logos into the design (e.g., at the top or in the corners) so they look like a natural part of the poster. Do not distort the logos. High quality, professional poster.";
      
      let finalImageUrl = '';
      
      try {
        const requestBody = {
          prompt: fullPrompt,
          model: imageModel,
          logos: {
            club: clubLogo,
            college: collegeLogo,
            slogan: sloganLogo
          }
        };

        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!imgRes.ok) {
          const errData = await imgRes.json();
          throw new Error(errData.error || 'فشل توليد الصورة');
        }

        const imgData = await imgRes.json();
        setRemainingImages(imgData.remaining);
        finalImageUrl = imgData.image;
        
      } catch (genError: any) {
        console.error("Generation Error:", genError);
        throw new Error(genError.message || "فشل توليد الصورة. يرجى المحاولة مرة أخرى.");
      }

      setResult({
        image: finalImageUrl,
        text1: postText1,
        text2: postText2,
        baseImagePrompt: imagePrompt,
      });
      setImageEditPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء التوليد. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async (isEdit: boolean = false) => {
    if (!result?.baseImagePrompt) return;
    setIsRegeneratingImage(true);
    setError('');

    try {
      let fullPrompt = result.baseImagePrompt + " The design must be elegant, academic, and Islamic. Use gold, black, and white colors. Include Arabic calligraphy style text for the title, date, time, and professor name. Add small social media icons (Facebook, Instagram, Telegram) with 'نادي جسور' at the bottom left corner like a signature. Format date and time in Arabic style (Right to Left) using standard digits (0-9). IMPORTANT: Precede dates, times, and locations with emojis and descriptive words (e.g., 📅 التاريخ: 03/03/2026, ⏰ الساعة: 13:15, 📍 القاعة: مقر النادي). STRICTLY NO ENGLISH TEXT. No human faces or people. The image MUST be a perfect square (1:1 aspect ratio). I have provided reference images (logos). Please creatively and elegantly integrate these logos into the design (e.g., at the top or in the corners) so they look like a natural part of the poster. Do not distort the logos. High quality, professional poster.";
      
      if (imageEditPrompt.trim()) {
        fullPrompt += ` Additional modifications: ${imageEditPrompt}`;
      }

      const requestBody: any = { 
        prompt: fullPrompt, 
        model: imageModel,
        logos: {
          club: clubLogo,
          college: collegeLogo,
          slogan: sloganLogo
        }
      };
      
      if (isEdit && result.image) {
        // Send the current image for editing
        requestBody.baseImage = result.image;
      }

      const imgRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!imgRes.ok) {
        const errData = await imgRes.json();
        throw new Error(errData.error || 'فشل إعادة توليد الصورة');
      }

      const imgData = await imgRes.json();
      setRemainingImages(imgData.remaining);
      
      setResult({
        ...result,
        image: imgData.image,
      });
    } catch (err: any) {
      console.error("Regenerate Error:", err);
      setError(err.message || "فشل إعادة توليد الصورة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsRegeneratingImage(false);
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">المساعد الإعلامي</h1>
            <p className="text-[#D4AF37] text-sm mt-1 font-medium tracking-wide">نادي جسور الطلابي - جامعة الجزائر 1</p>
          </div>
          {remainingImages !== null && (
            <div className="bg-[#D4AF37]/20 border border-[#D4AF37]/30 px-4 py-2 rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-white">
                الرصيد اليومي: <strong className="text-[#D4AF37] text-lg">{remainingImages}</strong> / 20
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
            {/* Logos Setup Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#D4AF37]" />
            إعداد الشعارات (تدمج تلقائياً في التصميم)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
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

            {/* Slogan Logo */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#D4AF37] transition-colors">
              {sloganLogo ? (
                <>
                  <img src={sloganLogo} alt="الشعار اللفظي" className="h-24 object-contain mb-3" />
                  <button 
                    onClick={() => removeLogo('slogan')}
                    className="absolute top-2 left-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="حذف الشعار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-green-600">تم رفع الشعار اللفظي</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/10 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#D4AF37]" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 mb-1">الشعار اللفظي</span>
                  <span className="text-xs text-gray-400">(نحو أفق الفكر والمعرفة)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleLogoUpload(e, 'slogan')}
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
            placeholder="مثال: شرح العقيدة الطحاوية يوم الثلاثاء 5 فيفري تاع 10:00 صباحا في مقر النادي تقديم الاستاذ ايتوح يوسف المجلس الثاني قوله ليس بعد خلق الخلق استفاد اسم الخالق"
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
                <option value="gemini-2.5-flash-image">Nano Banana 1 (مجاني - لا يدعم العربية)</option>
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (سريع ويدعم العربية)</option>
                <option value="gemini-3-pro-image-preview">Nano Banana Pro (جودة أعلى ويدعم العربية)</option>
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
              <div className="p-8 flex flex-col items-center bg-gray-50/50">
                <img 
                  src={result.image} 
                  alt="إعلان المجلس" 
                  className="max-w-full h-auto rounded-xl shadow-lg max-h-[600px] object-contain border border-gray-200/50 mb-6"
                  referrerPolicy="no-referrer"
                />
                
                <div className="w-full max-w-2xl bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="text"
                    value={imageEditPrompt}
                    onChange={(e) => setImageEditPrompt(e.target.value)}
                    placeholder="تعديلات إضافية؟ (مثال: اجعل الألوان أغمق، أضف زخرفة إسلامية...)"
                    className="flex-1 w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] block p-3 outline-none"
                  />
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleRegenerateImage(true)}
                      disabled={isRegeneratingImage || !imageEditPrompt.trim()}
                      className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#c4a030] text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                      title="تعديل التصميم الحالي مع الاحتفاظ بشكله العام"
                    >
                      {isRegeneratingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Edit3 className="w-4 h-4 text-white" />
                      )}
                      تعديل التصميم
                    </button>
                    <button
                      onClick={() => handleRegenerateImage(false)}
                      disabled={isRegeneratingImage}
                      className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                      title="توليد تصميم جديد كلياً"
                    >
                      {isRegeneratingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
                      )}
                      إعادة توليد
                    </button>
                  </div>
                </div>
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

