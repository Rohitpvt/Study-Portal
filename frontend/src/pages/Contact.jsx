import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Clock, 
  HelpCircle, 
  User, 
  AtSign, 
  Bookmark,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { trackEvent } from '../services/analytics';

export default function Contact() {
  const { userProfile } = useAuth();
  const { success, error: toastError, warn } = useNotification();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [faqOpen, setFaqOpen] = useState(null);

  // Pre-fill from userProfile
  React.useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.full_name || userProfile.display_name || prev.name,
        email: userProfile.email || prev.email
      }));
    }
  }, [userProfile]);

  const faqs = [
    {
      q: "How fast do you respond?",
      a: "Our typical response time is within 24-48 business hours. For urgent issues, please check the AI chatbot first!"
    },
    {
      q: "Can I suggest new features?",
      a: "Absolutely! Please use the 'Suggestion' subject in the contact form or contribute via the Contribute tab."
    },
    {
      q: "How do I report a bug?",
      a: "Provide a detailed description and steps to reproduce in the message field below."
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Internal Backend Submission (Primary/Record)
      await api.post('/support/contact', formData);
      trackEvent('contact_submit', { subject: formData.subject });
      
      // 2. Formspree Submission (Secondary/Email Notifications)
      let emailSuccess = true;
      try {
        const response = await fetch('https://formspree.io/f/xbdqkdlz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        if (!response.ok) emailSuccess = false;
      } catch (err) {
        emailSuccess = false;
        console.error("Formspree service error:", err);
      }

      // 3. Informative Feedback & Reset
      if (emailSuccess) {
        success("Message received! Internal record saved and email alerts triggered.");
      } else {
        warn("Message saved! Note: Email notification may be slightly delayed.");
      }
      
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      // Platform persistence failure - Critical Error
      let msg = "Platform database sync failed. Message not saved.";
      if (err.response?.data?.detail) {
        msg = Array.isArray(err.response.data.detail) 
            ? err.response.data.detail[0].msg 
            : err.response.data.detail;
      }
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="text-center space-y-4 mb-20">
        <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">How can we help?</h1>
        <p className="max-w-xl mx-auto text-lg text-slate-500 dark:text-slate-400 font-semibold leading-relaxed transition-colors">
          Have a question, feedback, or need technical support? 
          Our team is here to ensure your CU Study Portal experience is seamless.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* Contact Form Section */}
        <div className="lg:col-span-7">
          <div className="glass dark:bg-slate-900/50 rounded-[48px] p-8 md:p-12 shadow-2xl shadow-indigo-100 dark:shadow-none border border-white/40 dark:border-slate-800/50 transition-all">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
               <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               Send us a message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 mb-2 block transition-colors">Full Name</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                       <input 
                         required
                         type="text" 
                         name="name"
                         minLength={2}
                         maxLength={100}
                         value={formData.name}
                         onChange={handleChange}
                         placeholder="John Doe"
                         className="w-full pl-11 pr-4 py-4 bg-white/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 mb-2 block transition-colors">Email Address</label>
                    <div className="relative">
                       <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                       <input 
                         required
                         type="email" 
                         name="email"
                         value={formData.email}
                         onChange={handleChange}
                         placeholder="john@mca.christuniversity.in"
                         className="w-full pl-11 pr-4 py-4 bg-white/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                       />
                    </div>
                  </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 mb-2 block transition-colors">Subject</label>
                 <div className="relative">
                    <Bookmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input 
                      required
                      type="text" 
                      name="subject"
                      minLength={3}
                      maxLength={200}
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="e.g. Feedback about Chatbot"
                      className="w-full pl-11 pr-4 py-4 bg-white/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                    />
                 </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 mb-2 block transition-colors">Message</label>
                 <textarea 
                   required
                   name="message"
                   minLength={10}
                   maxLength={2000}
                   value={formData.message}
                   onChange={handleChange}
                   placeholder="Describe your inquiry in detail..."
                   className="w-full p-6 bg-white/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[32px] text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all shadow-sm h-48 resize-none"
                 />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 premium-gradient rounded-3xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    Send Inquiry
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

         {/* Contact Info Section */}
        <div className="lg:col-span-5 space-y-10">
          
          <div className="space-y-6">
             <h3 className="text-xl font-black text-slate-800 dark:text-white">Support Channels</h3>
             <div className="grid grid-cols-1 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 interactive-scale transition-colors">
                   <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                      <Mail className="w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Email Us</div>
                      <div className="font-bold text-slate-700 dark:text-slate-200 transition-colors">support@christuniversity.in</div>
                   </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 interactive-scale transition-colors">
                   <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Response Time</div>
                      <div className="font-bold text-slate-700 dark:text-slate-200 transition-colors">Within 24-48 Hours</div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 dark:text-white transition-colors">Common Questions</h3>
                <Link to="/chat" className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline transition-colors">Ask AI Beta</Link>
             </div>
             <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-300">
                     <button 
                       onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                       className="w-full flex items-center justify-between p-5 text-left"
                     >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{faq.q}</span>
                        {faqOpen === i ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                     </button>
                     {faqOpen === i && (
                       <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-50 dark:border-slate-800 pt-4">
                             {faq.a}
                          </p>
                       </div>
                     )}
                  </div>
                ))}
             </div>
          </div>

           <div className="premium-gradient/5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[40px] p-8 border border-indigo-100 dark:border-indigo-900/40 space-y-4 transition-colors">
             <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                <HelpCircle className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Feedback matters</span>
             </div>
             <p className="text-sm font-semibold text-indigo-900/70 dark:text-indigo-300/70 leading-relaxed">
               Your feedback helps us refine the AI research algorithms and resource categorizations. 
               We read every single submission!
             </p>
             <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-white/60 dark:bg-slate-800/60 py-2 px-4 rounded-xl w-fit">
               <CheckCircle2 className="w-4 h-4" /> Trusted Support
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
