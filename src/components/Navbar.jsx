import { Menu, X } from "lucide-react";
import { useState } from "react";
import cover from "../assets/cover.png";
import { navItems } from "../constants";
import { Link } from "react-router-dom"; {/*To link different pages*/}
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleNavbar = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  return (
    <nav className="sticky top-0 z-50 py-3 backdrop-blur-lg border-b border-neutral-700/80">
      <div className="container px-4 mx-auto relative lg:text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center flex-shrink-0">
           {/* <img className="h-10 w-30 mr-2" src={cover} alt="Logo"  />*/}
            <span className="text-xl tracking-tight">Salisbury DSP</span>
          </div>

          <ul className="hidden lg:flex space-x-12 justify-center items-center mx-auto">
          {navItems.map((item, index) => (
            <li key={index}>
              <Link to={item.href} className="text-white hover:text-red-600 transition">
                {item.label}
              </Link>
            </li>
          ))}
        </ul> 

          {/* Mobile menu button */}
          <div className="lg:hidden md:flex flex-col justify-end">
            <button onClick={toggleNavbar}>
              {mobileDrawerOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/*Mobile drawer code*/}
        {/*adjust the blur strength using backdrop-blur-sm, backdrop-blur-md, backdrop-blur-xl*/}
        {mobileDrawerOpen && (
  <AnimatePresence>
    <motion.div 
      initial={{ x: "100%" }} // Start off-screen
      animate={{ x: 0 }} // Slide in
      exit={{ x: "100%" }} // Slide out when closing
      transition={{ duration: 0.3, ease: "easeInOut" }} //smooth transition will display with this
      className="fixed right-0 z-20 backdrop-blur-lg bg-neutral-950/80 w-full p-12 flex flex-col justify-center items-center lg:hidden"
    >
      <ul className="w-full">
        {navItems.map((item, index) => (
          <li key={index} className="py-2">
            <Link 
              to={item.href} 
              className="block w-full p-4 text-center text-white transition duration-300 transform hover:scale-105" 
              //scale on hover
              onClick={() => setMobileDrawerOpen(false)} // Close menu on click
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  </AnimatePresence>
)}

      </div>
    </nav>
  );
};

export default Navbar;