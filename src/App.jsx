import React,{useState} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import AuthApi from "./components/AuthApi";
import { Home, TrendingUp, MessageCircle, Bot, ChartColumn } from 'lucide-react';
import Cookies from 'js-cookie';
import {reactLocalStorage} from 'reactjs-localstorage';

const WorkFlow = React.lazy(() => import("./pages/work-flow-page/main"));
const WorkFlowProject = React.lazy(() => import("./pages/work-flow-page/workflow-project"));
const apiUrl = import.meta.env.VITE_API_URL;



function App() {

  const randomString = (length = 10) => {
  return Math.random().toString(36).substring(2, 2 + length);
};



  const token = Cookies.get('token')?Cookies.get('token'):''
  const [auth, setAuth] = React.useState(token);
  const [Credit, setCredit] = React.useState("0");
  const [UserData, setUserData] = React.useState([]);
  const [userid, setuserId] = React.useState(0);
  const [theme, setTheme] = React.useState("light");
  const [activeTab, setActiveTab] = useState('Home');
  const [createdBy, setCreatedBy] = useState(null);
  const [isLoaded, setLoaded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const sidebarItems = [
     { icon: Home, label: 'Home', active: true, link:'/feed' },
     /*{ icon: TrendingUp, label: 'Popular', active:false, link:'/c/popular' },*/
     { icon: Bot, label: 'Ask' , active:false, link:'/ask'},
     { icon: ChartColumn, label: 'Explore', active:false, link:'/explore/' }
   ];




 
   

  React.useEffect(() => {
    const id = randomString(12);
   setLoaded(true);
    
    // Connect using your HTTPS domain

   if(!reactLocalStorage.get('createdBy')){
     reactLocalStorage.set('createdBy',randomString(12));
     setCreatedBy(id);
   }else{
    setCreatedBy(reactLocalStorage.get('createdBy'));
   }

   
  }, []);

  return (
   
    <Router>
      
        <AuthApi.Provider
          value={{
            auth,
            setAuth,
            userid,
            setuserId,
            theme,
            setTheme,
            setCredit,
            Credit,
            setUserData,
            UserData,
            setActiveTab,
            activeTab,
            setLoaded,
            isLoaded,
            setIsMobileMenuOpen,
            isMobileMenuOpen,
            createdBy,
            sidebarItems
          }}
        >
          
          <React.Suspense fallback={
            <div style={{width:'100%',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              
              <span style={{display:'flex',alignItems:'center',gap:10}}><img src={''} className={'md:w-90 w-[240px]'} />
               <h3 style={{ fontSize: 60 }}>
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
              
              </h3>
              
              </span>
              
              </div>}>
            <Routess UserData={UserData.length > 0 ? UserData : []} />
          </React.Suspense>
        </AuthApi.Provider>
      
    </Router>
   
  );
}

const Routess = ({ UserData }) => {
    const Auth = React.useContext(AuthApi);
    const location = useLocation();
    
  

  return (

     
    <Routes>
      
     <Route
        path={"/project/:id"}
        exact
        element={<WorkFlowProject userData={UserData.length > 0 ? UserData : []} />}
      />
       
     
      <Route
        path={"/"}
        exact
        element={<WorkFlow userData={UserData.length > 0 ? UserData : []} />}
      />
     
    </Routes>
    

    
  );

};


export default App;

