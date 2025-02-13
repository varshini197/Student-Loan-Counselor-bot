'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, RotateCcw, BarChart3, Loader, BookOpen, Globe, DollarSign, GraduationCap, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-lg rounded-lg p-6 ${className}`}>{children}</div>
);

const CardHeader = ({ children }) => (
  <div className="border-b border-gray-200 pb-4 mb-6">{children}</div>
);

const CardTitle = ({ children, Icon }) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon className="h-6 w-6 text-blue-600" />}
    <h2 className="text-2xl font-bold text-gray-800">{children}</h2>
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const Input = ({ name, placeholder, value, onChange, type = "text", min, icon: Icon }) => (
  <div className="relative">
    {Icon && (
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Icon className="h-5 w-5" />
      </div>
    )}
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      min={min}
      className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all ${Icon ? 'pl-11' : 'pl-4'}`}
    />
  </div>
);

const Button = ({ onClick, children, variant = "default", className = "", disabled, icon: Icon }) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200";
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300",
    destructive: "bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children}
    </button>
  );
};

const Textarea = ({ placeholder, value, onChange, className = "" }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all resize-none ${className}`}
  />
);

const Alert = ({ children, variant = "default" }) => (
  <div className={`p-4 rounded-lg ${variant === "destructive" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
    {children}
  </div>
);

const Spinner = () => (
  <Loader className="animate-spin h-5 w-5" />
);

const ResponseBubble = ({ children }) => {
  const formatResponse = (text) => {
    // Enhance text formatting with additional markdown support
    text = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/__(.*?)__/g, '<em>$1</em>') // Italics
      .replace(/## (.*)/g, '<h2>$1</h2>') // H2
      .replace(/^### (.*)/g, '<h3>$1</h3>'); // H3

    const paragraphs = text.split('\n\n');
    return paragraphs.map(paragraph => {
      if (paragraph.includes('\n-')) {
        const [intro, ...points] = paragraph.split('\n');
        const listItems = points
          .filter(point => point.trim())
          .map(point => `<li>${point.replace(/^-\s*/, '')}</li>`)
          .join('');
        return `<p>${intro}</p><ul>${listItems}</ul>`;
      } else {
        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
      }
    }).join('');
  };

  return (
    <div className="bg-blue-50 rounded-lg p-6 shadow-md text-gray-800">
      <div dangerouslySetInnerHTML={{ __html: formatResponse(children) }} />
    </div>
  );
};

export default function StudentLoanCounselor() {
  const [userDetails, setUserDetails] = useState({
    userId: uuidv4(),
    name: '',
    originCountry: '',
    destinationCountry: '',
    loanAmount: '',
    courseOfStudy: ''
  });

  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [response, setResponse] = useState('');
  const [summary, setSummary] = useState('');
  const [sentimentAnalysis, setSentimentAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleReport = async () => {
    if (!userDetails.userId) {
      setError('User ID is required to fetch the report');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/user-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userDetails.userId }),
      });

      const data = await res.json();
      setSentimentAnalysis(data.sentiment_analysis || '');
      setSummary(data.user_summary || '');
    } catch (err) {
      setError('Error fetching report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
  
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
  
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current);
        console.log('Audio Blob Created:', audioBlob);

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio URL:', audioUrl);

        // Convert speech to text using Web Speech API
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('Transcript:', transcript);
          // Set the transcript to a state or handle it as needed
          setSummary(transcript); // Assuming you want to store the text in the summary state
        };

        recognition.onerror = (event) => {
          setError('Speech recognition error: ' + event.error);
          console.error('Speech recognition error:', event);
        };

        const audio = new Audio(audioUrl);
        audio.onplay = () => {
          recognition.start();
        };

        audio.play();
      };
  
      mediaRecorder.current.onerror = (event) => {
        setError('Recording error: ' + event.error);
        console.error('MediaRecorder error:', event);
      };
  
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
      console.error('Error during recording setup:', err);
    }
  };
  

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!userDetails.userId || !message.trim()) {
      setError('Please provide both a message and user details');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userDetails.userId,
          message,
          student_details: {
            name: userDetails.name,
            origin_country: userDetails.originCountry,
            destination_country: userDetails.destinationCountry,
            loan_amount_needed: userDetails.loanAmount,
            course_of_study: userDetails.courseOfStudy
          }
        }),
      });

      const data = await res.json();
      if (data.response) {
        setResponse(data.response.response);
        const speech = new SpeechSynthesisUtterance(data.response.response);
        window.speechSynthesis.speak(speech);
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = async () => {
    if (!userDetails.userId) {
      setError('User ID is required');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userDetails.userId }),
      });
      
      const data = await res.json();
      if (data.message) {
        setResponse('');
        setMessage('');
        setError('');
        setSentimentAnalysis('');
        setSummary('');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-800 mb-4">
            🎓 Student Loan Counselor AI
          </h1>
          <p className="text-gray-600 text-lg">
            Your intelligent guide to educational financing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle Icon={User}>Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  name="name"
                  placeholder="Full Name"
                  value={userDetails.name}
                  onChange={handleInputChange}
                  icon={User}
                />
                <Input
                  name="originCountry"
                  placeholder="Home Country"
                  value={userDetails.originCountry}
                  onChange={handleInputChange}
                  icon={Globe}
                />
                <Input
                  name="destinationCountry"
                  placeholder="Study Destination"
                  value={userDetails.destinationCountry}
                  onChange={handleInputChange}
                  icon={Globe}
                />
                <Input
                  type="number"
                  name="loanAmount"
                  placeholder="Loan Amount ($)"
                  value={userDetails.loanAmount}
                  onChange={handleInputChange}
                  min="0"
                  icon={DollarSign}
                />
                <Input
                  name="courseOfStudy"
                  placeholder="Program of Study"
                  value={userDetails.courseOfStudy}
                  onChange={handleInputChange}
                  icon={GraduationCap}
                />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle Icon={BookOpen}>Chat Assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <p className="font-medium">{error}</p>
                  </Alert>
                )}

                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "default"}
                  className="w-full"
                  icon={Mic}
                >
                  {isRecording ? 'Stop Recording' : 'Start Voice Input'}
                </Button>

                <Textarea
                  placeholder="Type your question about student loans..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-32 text-black"
                />

                <Button 
                  onClick={sendMessage}
                  disabled={loading}
                  className="w-full"
                  icon={Send}
                >
                  {loading ? <Spinner /> : 'Send Message'}
                </Button>

                {response && <ResponseBubble>{response}</ResponseBubble>}

                <div className="flex gap-4">
                  <Button
                    onClick={resetChat}
                    variant="outline"
                    className="w-full"
                    icon={RotateCcw}
                  >
                    Reset Chat
                  </Button>
                  <Button
                    onClick={handleReport}
                    variant="outline"
                    className="w-full"
                    icon={BarChart3}
                  >
                    View Report
                  </Button>
                </div>

                {(sentimentAnalysis || summary) && (
                  <div className="space-y-6">
                    {sentimentAnalysis && (
                      <ResponseBubble>{sentimentAnalysis}</ResponseBubble>
                    )}
                    {summary && (
                      <div className="flex flex-col gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Summary</h2>
                        <ResponseBubble>{summary}</ResponseBubble>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}