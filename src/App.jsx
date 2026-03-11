import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  User, 
  BookOpen, 
  Briefcase, 
  Star, 
  Send, 
  CheckCircle, 
  ShieldCheck, 
  Home, 
  GraduationCap, 
  HeartHandshake,
  Settings,
  Lock,
  X,
  Plus,
  Trash2,
  Clock,
  Loader2,
  BarChart3,
  Search,
  ToggleLeft,
  Calendar,
  ChevronUp,
  ChevronDown,
  Building
} from 'lucide-react';

// 這裡我們直接使用您的 Google Apps Script 網址
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdlUCuoie68P05xXWqBHKbyJ9pAxYgKF-llzLOJThouYFZceD6OleP6FgyK_92JNH9/exec';

// 將 18 個評分項目簡化為好閱讀的標籤，順序必須與送出時的欄位一致
const RATING_LABELS = [
  '起薪 42K~58K', '專業/地區加薪', '升遷制度透明', '年終考績 2.5 個月', '每年多存 20 萬', '最快 38 歲退休俸',
  '水電半價', '營區住宿三餐便宜',
  '外散宿兼顧家庭', '慰勞假最高 30 天', '國定假日見紅休', '慰勞假獎金核銷',
  '軍校零用金', '公餘進修補助', '免費培訓專長證照',
  '職務官舍便宜', '結婚生育本俸', '子女教育補助'
];

// 將題目資料移到外部，方便全域存取
const RATING_CATEGORIES = [
  {
    title: "一、薪資待遇與職涯發展",
    icon: <Briefcase className="w-5 h-5 text-blue-600" />,
    items: [
      { id: 'sal_1', text: '軍職最低起薪 42,150 元 / 最高起薪 58,500 元' },
      { id: 'sal_2', text: '依照專業領域、領導身份、服務地區等，替自己加薪' },
      { id: 'sal_3', text: '升遷制度透明，你的所有努力都會詳細記載' },
      { id: 'sal_4', text: '每年有年終考績 2.5 個月' },
      { id: 'sal_5', text: '生活成本低，每年多存 20 萬起不是問題' },
      { id: 'sal_6', text: '連續工作滿 20 年，最快 38 歲可申請終生俸/退休俸' },
    ]
  },
  {
    title: "二、食宿環境與補助",
    icon: <Home className="w-5 h-5 text-green-600" />,
    items: [
      { id: 'liv_1', text: '水費 20 度、電費 300 度以內半價' },
      { id: 'liv_2', text: '營區宿舍住免錢，水電費免繳，每月三餐費用只要 1700 元起' },
    ]
  },
  {
    title: "三、休假制度與生活平衡",
    icon: <HeartHandshake className="w-5 h-5 text-purple-600" />,
    items: [
      { id: 'vac_1', text: '軍人平日皆可輪流外散宿離營，休閒娛樂、兼顧家庭 so easy' },
      { id: 'vac_2', text: '慰勞假/特休最高 30 天' },
      { id: 'vac_3', text: '國定假日見紅就休，部隊留守也能彈性補假' },
      { id: 'vac_4', text: '慰勞假獎金最高16,000元，你的消費，國家讓你核銷' },
    ]
  },
  {
    title: "四、進修資源與教育福利",
    icon: <GraduationCap className="w-5 h-5 text-orange-600" />,
    items: [
      { id: 'edu_1', text: '就讀軍校優惠多，還有每月 17,300 元的零用金' },
      { id: 'edu_2', text: '公餘進修，下班讀書學費最高可申請 20,000 元補助' },
      { id: 'edu_3', text: '無經驗可，免費培訓專長與證照' },
    ]
  },
  {
    title: "五、家庭支持與育兒福利",
    icon: <ShieldCheck className="w-5 h-5 text-red-600" />,
    items: [
      { id: 'fam_1', text: '物美價廉的職務官舍，月租只要 1600 元起，輕鬆成家好有感' },
      { id: 'fam_2', text: '結婚、生育可申請 2 個月本俸' },
      { id: 'fam_3', text: '子女教育補助費，最高每學期可申請 35,800 元' },
    ]
  }
];

const defaultVisibility = {};
RATING_CATEGORIES.forEach(cat => {
  cat.items.forEach(item => {
    defaultVisibility[item.id] = true;
  });
});

// 處理 Google 試算表異常日期格式的解析器
const parseSheetDate = (dateStr) => {
  if (!dateStr) return new Date('invalid');
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const match = String(dateStr).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  return new Date('invalid');
};

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeSpentDisplay, setTimeSpentDisplay] = useState('');
  
  const [instructors, setInstructors] = useState([]);
  const [schools, setSchools] = useState([]); // 新增：學校名單狀態
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authTarget, setAuthTarget] = useState(null); 
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [newInstructorName, setNewInstructorName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState(''); // 新增：新學校輸入狀態
  const [activeTab, setActiveTab] = useState('questions'); 

  const [surveyData, setSurveyData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // 面板搜尋與篩選相關狀態
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [itemVisibility, setItemVisibility] = useState(defaultVisibility);

  const [formData, setFormData] = useState({
    school: '', gradeClass: '', name: '', studentId: '', phone: '', instructor: '',
    postGradPlan: '', postGradPlanDetail: '', lifeStyle: '',
    ratings: {}, finalChoice: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getInitData' })
        });
        const data = await res.json();
        
        if (data.instructors) setInstructors(data.instructors);
        if (data.schools) setSchools(data.schools);
        if (data.itemVisibility) setItemVisibility(prev => ({ ...prev, ...data.itemVisibility }));
      } catch (error) {
        console.error("初始化資料讀取發生錯誤:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchInitData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getSurveyData' })
      });
      const result = await res.json();
      
      if (result.data) {
        const formatted = result.data.map(r => {
           const len = r.length;
           if (len < 13) return {};

           return {
             date: r[0], 
             school: r[1], 
             grade: r[2], 
             name: r[3], 
             id: r[4], 
             phone: r[5],
             instructor: r[6], 
             plan: r[7], 
             planDetail: r[8], 
             lifeStyle: r[9],
             choice: r[len - 3],     
             timeSecs: r[len - 2],   
             timeStr: r[len - 1],    
             ratings: r.slice(10, len - 3)
           };
        }).filter(r => r.name && r.name !== '姓名');
        
        setSurveyData(formatted.reverse()); 
      }
    } catch (error) {
      console.error("載入數據失敗:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const openAuthModal = (target) => {
    setAuthTarget(target);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === '0609') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
      
      if (authTarget === 'settings') {
        setShowSettingsModal(true);
        setActiveTab('questions'); 
      } else if (authTarget === 'dashboard') {
        setShowDashboardModal(true);
        fetchDashboardData();
      }
    } else {
      setPasswordError(true);
    }
  };

  const closeSettings = () => {
    setShowSettingsModal(false);
    setShowDashboardModal(false);
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError(false);
  };

  const toggleItem = async (itemId) => {
    const updatedVisibility = { ...itemVisibility, [itemId]: !itemVisibility[itemId] };
    setItemVisibility(updatedVisibility); 

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateVisibility', visibility: updatedVisibility })
      });
    } catch (error) {
      console.error("同步題型設定至雲端失敗:", error);
    }
  };

  // =============== 教官名單管理邏輯 ===============
  const handleAddInstructor = async (e) => {
    e.preventDefault();
    const name = newInstructorName.trim();
    if (name && !instructors.includes(name)) {
      const newList = [...instructors, name];
      setInstructors(newList);
      setNewInstructorName('');
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateInstructors', instructors: newList })
        });
      } catch (error) {}
    }
  };

  const handleDeleteInstructor = async (nameToDelete) => {
    const newList = instructors.filter(name => name !== nameToDelete);
    setInstructors(newList);
    if (formData.instructor === nameToDelete) setFormData(prev => ({ ...prev, instructor: '' }));
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateInstructors', instructors: newList })
      });
    } catch (error) {}
  };

  const handleMoveInstructor = async (index, direction) => {
    const newList = [...instructors];
    if (direction === 'up' && index > 0) {
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    } else if (direction === 'down' && index < newList.length - 1) {
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    } else {
      return; 
    }
    
    setInstructors(newList); 
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateInstructors', instructors: newList })
      });
    } catch (error) {}
  };

  // =============== 學校名單管理邏輯 ===============
  const handleAddSchool = async (e) => {
    e.preventDefault();
    const name = newSchoolName.trim();
    if (name && !schools.includes(name)) {
      const newList = [...schools, name];
      setSchools(newList);
      setNewSchoolName('');
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateSchools', schools: newList })
        });
      } catch (error) {}
    }
  };

  const handleDeleteSchool = async (nameToDelete) => {
    const newList = schools.filter(name => name !== nameToDelete);
    setSchools(newList);
    if (formData.school === nameToDelete) setFormData(prev => ({ ...prev, school: '' }));
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateSchools', schools: newList })
      });
    } catch (error) {}
  };

  const handleMoveSchool = async (index, direction) => {
    const newList = [...schools];
    if (direction === 'up' && index > 0) {
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    } else if (direction === 'down' && index < newList.length - 1) {
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    } else {
      return; 
    }
    
    setSchools(newList); 
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateSchools', schools: newList })
      });
    } catch (error) {}
  };

  // =============== 表單輸入與送出邏輯 ===============
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'postGradPlan') {
      setFormData(prev => ({ ...prev, postGradPlan: value, postGradPlanDetail: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRatingChange = (itemId, score) => {
    setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, [itemId]: score } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const endTime = Date.now();
    const spentSeconds = Math.floor((endTime - startTime) / 1000);
    const spentString = `${Math.floor(spentSeconds / 60)} 分 ${spentSeconds % 60} 秒`;
    setTimeSpentDisplay(spentString);

    const submitData = {
      action: 'submitSurvey',
      ...formData,
      timeSpentSeconds: spentSeconds,
      timeSpentFormatted: spentString
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(submitData)
      });
    } catch (error) {
      console.error("寫入 Google Sheet 時發生錯誤:", error);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 面板資料處理
  const allSearchableTerms = useMemo(() => {
    const terms = new Set();
    surveyData.forEach(item => {
      if (item.name) terms.add(item.name);
      if (item.school) terms.add(item.school);
      if (item.instructor) terms.add(item.instructor);
    });
    return Array.from(terms);
  }, [surveyData]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setTempSearchQuery(val);
    
    if (val.trim() === '') {
      setShowSuggestions(false);
    } else {
      const matches = allSearchableTerms.filter(term => 
        term.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(matches);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (term) => {
    setTempSearchQuery(term);
    setShowSuggestions(false);
  };

  const executeSearch = () => {
    setAppliedSearchQuery(tempSearchQuery);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setTempSearchQuery('');
    setTempStartDate('');
    setTempEndDate('');
    setAppliedSearchQuery('');
    setAppliedStartDate('');
    setAppliedEndDate('');
  };

  const filteredData = surveyData.filter(item => {
    const matchesSearch = !appliedSearchQuery || 
      item.name?.includes(appliedSearchQuery) || 
      item.school?.includes(appliedSearchQuery) || 
      item.instructor?.includes(appliedSearchQuery);

    let matchesDate = true;
    if (appliedStartDate || appliedEndDate) {
      const itemDate = parseSheetDate(item.date);
      if (!isNaN(itemDate.getTime())) {
        itemDate.setHours(0, 0, 0, 0); 
        
        if (appliedStartDate) {
          const sDate = new Date(appliedStartDate);
          sDate.setHours(0, 0, 0, 0);
          if (itemDate < sDate) matchesDate = false;
        }
        if (appliedEndDate) {
          const eDate = new Date(appliedEndDate);
          eDate.setHours(23, 59, 59, 999); 
          if (itemDate > eDate) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesDate;
  });

  const getChoiceTag = (choiceText) => {
    if (!choiceText) return { label: '未填寫', color: 'bg-gray-100 text-gray-600' };
    if (choiceText.includes('很有興趣')) return { label: '很有興趣', color: 'bg-green-100 text-green-700 border-green-200' };
    if (choiceText.includes('不排斥')) return { label: '正在考慮中', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (choiceText.includes('尚無需求') || choiceText.includes('沒有需求')) return { label: '暫無需求', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: '沒興趣', color: 'bg-gray-100 text-gray-500 border-gray-200' };
  };

  const handleResetForm = () => {
    setFormData({
      school: '', gradeClass: '', name: '', studentId: '', phone: '', instructor: '',
      postGradPlan: '', postGradPlanDetail: '', lifeStyle: '',
      ratings: {}, finalChoice: ''
    });
    setStartTime(Date.now()); 
    setIsSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">載入問卷中</h2>
        <p className="text-gray-500 text-sm">正在同步最新資料與名單...</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center space-y-6 transform transition-all">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">感謝您的填寫！</h2>
          <p className="text-gray-600 leading-relaxed">
            您的意見對我們非常重要。我們已收到您的問卷回覆，<br/>
            祝福您未來的職涯發展順利！
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-500 bg-gray-50 inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-100">
              <Clock className="w-4 h-4" />
              <span>填寫耗時：{timeSpentDisplay}</span>
            </p>
          </div>
          <button 
            onClick={handleResetForm}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            返回重新填寫
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans relative">
      
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/70 z-[100] flex flex-col items-center justify-center backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">問卷傳送中...</h3>
            <p className="text-gray-500 text-sm">請稍候，正在將您的回覆安全地儲存至雲端</p>
          </div>
        </div>
      )}

      {/* 共用語密碼驗證 Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold">管理員驗證</h3>
              </div>
              <button onClick={closeSettings} className="text-slate-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6">
              <p className="text-sm text-gray-600 mb-4">請輸入密碼以進入{authTarget === 'dashboard' ? '數據分析面板' : '系統管理後台'}</p>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="請輸入密碼"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                  passwordError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-slate-200 focus:border-slate-500'
                }`}
              />
              {passwordError && <p className="text-red-500 text-sm mt-2">密碼錯誤，請重新輸入</p>}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeSettings} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  取消
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 數據分析面板 (Dashboard) Modal ==================== */}
      {showDashboardModal && (
        <div className="fixed inset-0 bg-slate-100 z-[100] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white shadow-md z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">問卷結果數據分析面板</h3>
                <p className="text-slate-400 text-xs">即時同步 Google 試算表資料</p>
              </div>
            </div>
            <button onClick={closeSettings} className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
                
                <div className="relative flex-1 w-full lg:max-w-xs z-20">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜尋姓名、學校、教官..." 
                    value={tempSearchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                    onFocus={() => { if (tempSearchQuery && suggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                      {suggestions.map((suggestion, index) => (
                        <li 
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-none"
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-600 w-full lg:w-auto overflow-x-auto">
                  <Calendar className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                  <div className="flex items-center whitespace-nowrap">
                    <input 
                      type="date" 
                      value={tempStartDate} 
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="bg-transparent border-none outline-none cursor-pointer w-[115px]"
                    />
                    <span className="mx-2 text-gray-400">至</span>
                    <input 
                      type="date" 
                      value={tempEndDate} 
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="bg-transparent border-none outline-none cursor-pointer w-[115px]"
                    />
                  </div>
                </div>

                <div className="flex space-x-2 w-full lg:w-auto">
                  <button 
                    onClick={executeSearch}
                    className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center shadow-sm"
                  >
                    <Search className="w-4 h-4 mr-1" /> 搜尋
                  </button>
                  <button 
                    onClick={clearSearch}
                    className="flex-1 lg:flex-none bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center"
                  >
                    清除
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 mt-1 text-sm text-gray-500">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>很有興趣</div>
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>正在考慮中</div>
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>暫無需求</div>
                </div>
                <div className="font-bold bg-slate-100 px-3 py-1 rounded-full text-gray-700 shadow-inner">
                  篩選出 {filteredData.length} 筆
                </div>
              </div>
            </div>

            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                <p>正在從雲端載入最新數據...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200 text-gray-400">
                找不到符合條件的問卷資料，請嘗試調整搜尋字詞或日期區間。
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-0">
                {filteredData.map((item, idx) => {
                  const tag = getChoiceTag(item.choice);
                  return (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                      <div className="p-5 border-b border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-xl text-gray-800">{item.name}</h4>
                              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.school} {item.grade}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                              <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {item.instructor}</span>
                              <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {item.date}</span>
                              {item.timeStr && (
                                <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                                  耗時 {item.timeStr}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold shadow-sm ${tag.color}`}>
                            {tag.label}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-gray-700">
                          <p><span className="font-bold text-slate-500">規劃:</span> {item.plan} {item.planDetail ? `(${item.planDetail})` : ''}</p>
                          <p className="mt-1"><span className="font-bold text-slate-500">嚮往:</span> {item.lifeStyle}</p>
                        </div>
                      </div>

                      <div className="p-5 bg-gray-50 flex-1">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                          <Star className="w-3 h-3 mr-1 text-yellow-500" /> 學生最在意的福利亮點 ({'>'}4分)
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {item.ratings && item.ratings.map((score, index) => {
                            const numScore = parseInt(score);
                            if (numScore === 5) {
                              return <span key={index} className="px-2 py-1 bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold">{RATING_LABELS[index]} (5分)</span>;
                            }
                            if (numScore === 4) {
                              return <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded text-xs font-medium">{RATING_LABELS[index]} (4分)</span>;
                            }
                            return null;
                          })}
                          {(!item.ratings || !item.ratings.some(s => parseInt(s) >= 4)) && (
                            <span className="text-sm text-gray-400 italic">無特別偏好的項目</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 系統設定與管理 Modal (三分頁設計) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 p-5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <h3 className="font-bold text-lg">系統管理後台</h3>
              </div>
              <button onClick={closeSettings} className="text-slate-300 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex border-b border-gray-200 shrink-0 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('questions')}
                className={`flex-1 py-3 px-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'questions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <ToggleLeft className="w-4 h-4" />
                  <span>題型顯示設定</span>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('schools')}
                className={`flex-1 py-3 px-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'schools' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Building className="w-4 h-4" />
                  <span>學校名單管理</span>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('instructors')}
                className={`flex-1 py-3 px-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'instructors' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <User className="w-4 h-4" />
                  <span>教官名單管理</span>
                </div>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
              
              {/* 分頁 1: 問卷細項顯示設定 */}
              {activeTab === 'questions' && (
                <div className="animate-in fade-in duration-300">
                  <p className="text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start">
                    <span className="mr-2">☁️</span>
                    <span>您的設定會<strong>即時同步至雲端</strong>。所有透過手機掃描 QR Code 開啟此問卷的學生，都會自動套用您目前的題型開關狀態。</span>
                  </p>
                  
                  <div className="space-y-6">
                    {RATING_CATEGORIES.map((category, catIdx) => (
                      <div key={catIdx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h5 className="font-bold text-gray-800 mb-3 flex items-center">
                          {category.icon}
                          <span className="ml-2">{category.title}</span>
                        </h5>
                        <div className="space-y-1">
                          {category.items.map(item => (
                            <label key={item.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                              <span className={`text-sm pr-4 transition-all ${itemVisibility[item.id] ? 'text-gray-800 font-medium' : 'text-gray-400 line-through'}`}>
                                {item.text}
                              </span>
                              <div className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={!!itemVisibility[item.id]}
                                  onChange={() => toggleItem(item.id)} 
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分頁 2: 學校名單管理 */}
              {activeTab === 'schools' && (
                <div className="animate-in fade-in duration-300">
                  <p className="text-sm text-gray-500 mb-6 bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-start">
                    <span className="mr-2">🏫</span>
                    <span>此名單同步至雲端試算表。所有學生打開表單的「學校」下拉選單會依據此順序顯示。</span>
                  </p>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleAddSchool} className="flex space-x-3 mb-8">
                      <input
                        type="text"
                        value={newSchoolName}
                        onChange={(e) => setNewSchoolName(e.target.value)}
                        placeholder="輸入學校名稱 (如: 青年高中)"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                      />
                      <button type="submit" disabled={!newSchoolName.trim()} className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center space-x-2 font-bold transition-colors shadow-sm">
                        <Plus className="w-5 h-5" /><span>新增</span>
                      </button>
                    </form>

                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                        目前學校名單
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{schools.length} 所</span>
                      </h4>
                      {schools.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400">目前尚無學校名單，請由上方新增</div>
                      ) : (
                        <ul className="space-y-3">
                          {schools.map((name, idx) => (
                            <li key={name} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors shadow-sm">
                              <span className="font-bold text-gray-700">{name}</span>
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleMoveSchool(idx, 'up')} 
                                  disabled={idx === 0}
                                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed p-2 hover:bg-indigo-50 rounded-lg transition-colors" 
                                  title="向上移動"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleMoveSchool(idx, 'down')} 
                                  disabled={idx === schools.length - 1}
                                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed p-2 hover:bg-indigo-50 rounded-lg transition-colors" 
                                  title="向下移動"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteSchool(name)} 
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" 
                                  title="刪除"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 分頁 3: 教官名單管理 */}
              {activeTab === 'instructors' && (
                <div className="animate-in fade-in duration-300">
                  <p className="text-sm text-gray-500 mb-6 bg-green-50 p-3 rounded-lg border border-green-100 flex items-start">
                    <span className="mr-2">🔄</span>
                    <span>這裡的變更會即時同步到 Google 雲端試算表中。<br/>所有開啟此問卷的裝置，都會同步更新為最新的教官選單。</span>
                  </p>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleAddInstructor} className="flex space-x-3 mb-8">
                      <input
                        type="text"
                        value={newInstructorName}
                        onChange={(e) => setNewInstructorName(e.target.value)}
                        placeholder="輸入新教官姓名 (如: 陳大明 教官)"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                      />
                      <button type="submit" disabled={!newInstructorName.trim()} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center space-x-2 font-bold transition-colors shadow-sm">
                        <Plus className="w-5 h-5" /><span>新增</span>
                      </button>
                    </form>

                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                        目前線上名單
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{instructors.length} 位</span>
                      </h4>
                      {instructors.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400">目前尚無教官名單，請由上方新增</div>
                      ) : (
                        <ul className="space-y-3">
                          {instructors.map((name, idx) => (
                            <li key={name} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors shadow-sm">
                              <span className="font-bold text-gray-700">{name}</span>
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleMoveInstructor(idx, 'up')} 
                                  disabled={idx === 0}
                                  className="text-gray-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed p-2 hover:bg-green-50 rounded-lg transition-colors" 
                                  title="向上移動"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleMoveInstructor(idx, 'down')} 
                                  disabled={idx === instructors.length - 1}
                                  className="text-gray-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed p-2 hover:bg-green-50 rounded-lg transition-colors" 
                                  title="向下移動"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteInstructor(name)} 
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" 
                                  title="刪除"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* -------------------- 主要問卷表單內容 -------------------- */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden mt-4">
        
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center space-x-3 z-20">
            <button 
              onClick={() => openAuthModal('dashboard')}
              className="flex items-center space-x-1.5 px-3 py-2 text-blue-100 hover:text-white bg-blue-900/30 hover:bg-blue-900/60 rounded-lg transition-all border border-blue-700/50 backdrop-blur-sm"
              title="查看數據分析面板"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">看數據</span>
            </button>
            <button 
              onClick={() => openAuthModal('settings')}
              className="p-2 text-blue-300 hover:text-white bg-blue-900/20 hover:bg-blue-900/50 rounded-full transition-all"
              title="系統設定與管理"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <ShieldCheck className="w-64 h-64" />
          </div>
          <div className="relative z-10 pr-24 sm:pr-40">
            <div className="flex items-center space-x-3 mb-2">
              <ClipboardList className="w-8 h-8 text-blue-200" />
              <h1 className="text-3xl font-bold tracking-wider">未來發展與國軍福利意向調查</h1>
            </div>
            <p className="text-blue-100 mt-2 text-lg">
              為了解同學畢業後的規劃及對國軍相關福利待遇的看法，請協助我們完成這份問卷。
            </p>
            <div className="flex items-center space-x-2 text-blue-200 mt-4 text-sm bg-blue-900/30 inline-flex px-3 py-1.5 rounded-full border border-blue-700/50 backdrop-blur-sm">
              <Clock className="w-4 h-4" />
              <span>{currentTime.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-12">
          
          <section>
            <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">基本資料</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 學校下拉選單 */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-bold text-gray-700">學校</label>
                <div className="relative">
                  <select
                    required
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                  >
                    <option value="" disabled>請選擇學校</option>
                    {schools.map((sch) => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {[
                { label: '班級', name: 'gradeClass', type: 'text', placeholder: '例：三年二班' },
                { label: '姓名', name: 'name', type: 'text', placeholder: '請輸入真實姓名' },
                { label: '學號', name: 'studentId', type: 'text', placeholder: '請輸入學號' },
                { label: '電話', name: 'phone', type: 'tel', placeholder: '聯絡電話 / 手機' },
              ].map((field) => (
                <div key={field.name} className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-gray-700">{field.label}</label>
                  <input
                    required
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              ))}
              
              {/* 教官下拉選單 */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-bold text-gray-700">宣導教官</label>
                <div className="relative">
                  <select
                    required
                    name="instructor"
                    value={formData.instructor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                  >
                    <option value="" disabled>請選擇宣導教官</option>
                    {instructors.map((inst) => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-3 mb-6">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">意向調查</h2>
            </div>
            
            <div className="space-y-8">
              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">1. 畢業後，你的規劃是？</h3>
                <div className="flex flex-col space-y-3">
                  {[
                    { label: '繼續升學', placeholder: '請填入就讀哪間學校 / 科系' },
                    { label: '直接就業', placeholder: '請填入準備應徵什麼工作' },
                    { label: '其它', placeholder: '請簡單說明您的規劃...' }
                  ].map((option) => (
                    <div key={option.label} className="flex flex-col">
                      <label className="flex items-center space-x-3 cursor-pointer group mb-1">
                        <input
                          required
                          type="radio"
                          name="postGradPlan"
                          value={option.label}
                          checked={formData.postGradPlan === option.label}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 group-hover:text-blue-700 font-medium">{option.label}</span>
                      </label>
                      
                      {formData.postGradPlan === option.label && (
                        <div className="pl-8 pt-1 pb-2 transition-all duration-300 ease-in-out">
                          <input
                            type="text"
                            name="postGradPlanDetail"
                            value={formData.postGradPlanDetail}
                            onChange={handleInputChange}
                            placeholder={option.placeholder}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">2. 如果有一天，你不再是學生，會嚮往哪一種生活？</h3>
                <div className="flex flex-col space-y-4">
                  {[
                    '有固定的工作與收入，生活穩定有保障，喜歡安全感',
                    '挑戰自己，只要能為自己鍍金，脫離舒適圈也沒關係',
                    '完全沒想法，想邊走邊看，再做決定'
                  ].map((option) => (
                    <label key={option} className="flex items-start space-x-3 cursor-pointer group">
                      <input
                        required
                        type="radio"
                        name="lifeStyle"
                        value={option}
                        checked={formData.lifeStyle === option}
                        onChange={handleInputChange}
                        className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-blue-700 leading-tight font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: 福待遇評分 */}
          {RATING_CATEGORIES.some(cat => cat.items.some(item => itemVisibility[item.id])) && (
            <section>
              <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-3 mb-6">
                <Star className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">福利待遇與保障評分</h2>
              </div>
              <p className="text-gray-600 mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                關於以下國軍的福利待遇與保障，請依主觀評價給予評分。<br/>
                <span className="font-bold text-yellow-800">
                  採線性刻度 1~5 分 (<span className="text-red-500">1 完全不在乎</span>；<span className="text-green-600">5 最在乎</span>)
                </span>
              </p>

              <div className="space-y-8">
                {RATING_CATEGORIES.map((category, catIndex) => {
                  const visibleItems = category.items.filter(item => itemVisibility[item.id]);
                  if (visibleItems.length === 0) return null;
                  
                  return (
                    <div key={catIndex} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center space-x-3">
                        {category.icon}
                        <h3 className="text-lg font-bold text-gray-800">{category.title}</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {visibleItems.map((item) => (
                          <div key={item.id} className="p-6 sm:flex sm:items-center sm:justify-between hover:bg-gray-50 transition-colors">
                            <div className="sm:w-3/5 mb-6 sm:mb-0 pr-4">
                              <p className="text-gray-700 font-medium leading-relaxed">
                                <span className="text-blue-500 mr-2">•</span>
                                {item.text}
                              </p>
                            </div>
                            
                            <div className="sm:w-2/5 flex flex-col items-center sm:items-end">
                              <div className="w-full max-w-[280px] bg-white border border-gray-200 rounded-full p-2 flex justify-between relative mt-2 sm:mt-0">
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <label key={score} className="relative flex flex-col items-center cursor-pointer group">
                                    <input
                                      required
                                      type="radio"
                                      name={item.id}
                                      value={score}
                                      checked={formData.ratings[item.id] === score.toString()}
                                      onChange={() => handleRatingChange(item.id, score.toString())}
                                      className="sr-only" 
                                    />
                                    <div className={`
                                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 z-10
                                      ${formData.ratings[item.id] === score.toString() 
                                        ? 'bg-blue-600 text-white shadow-md transform scale-110' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-blue-100 border border-gray-300'}
                                    `}>
                                      {score}
                                    </div>
                                    {score === 1 && <span className="absolute top-full mt-1.5 text-[11px] text-red-500 font-bold whitespace-nowrap">完全不在乎</span>}
                                    {score === 5 && <span className="absolute top-full mt-1.5 text-[11px] text-green-600 font-bold whitespace-nowrap">最在乎</span>}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-3 mb-6">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">總結抉擇</h2>
            </div>
            
            <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">站在人生的轉捩點，你會怎麼選擇？</h3>
              <div className="flex flex-col space-y-4">
                {[
                  '很有興趣，請為我規劃職涯藍圖，清晰勾勒未來的願景。',
                  '不排斥深入了解，多一份資訊就多一個選擇，這對我來說很有幫助。',
                  '現階段尚無需求，若日後有最新動態或消息，歡迎不定期分享。',
                  '感謝說明，我已充分了解。目前我有其他既定計畫，暫不考慮。'
                ].map((option) => (
                  <label key={option} className="flex items-start space-x-3 cursor-pointer group bg-white p-4 rounded-lg border border-indigo-50 hover:border-indigo-300 hover:shadow-sm transition-all">
                    <input
                      required
                      type="radio"
                      name="finalChoice"
                      value={option}
                      checked={formData.finalChoice === option}
                      onChange={handleInputChange}
                      className="w-5 h-5 mt-0.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700 group-hover:text-indigo-800 leading-tight font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <div className="pt-8 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all w-full sm:w-auto overflow-hidden ${
                isSubmitting 
                  ? 'bg-blue-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              <span className="relative z-10">{isSubmitting ? '資料傳送中...' : '送出問卷'}</span>
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 relative z-10 animate-spin" />
              ) : (
                <Send className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              )}
              {!isSubmitting && (
                <div className="absolute inset-0 h-full w-full bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full opacity-0 group-hover:opacity-100 origin-center pointer-events-none"></div>
              )}
            </button>
          </div>

        </form>
      </div>
      
      <div className="text-center mt-8 pb-8 text-gray-400 text-sm">
        <p>© 2024 國軍招募暨職涯發展意向調查. All rights reserved.</p>
      </div>
    </div>
  );
}
