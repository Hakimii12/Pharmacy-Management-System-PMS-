// src/components/Loading.js
import React from 'react';
import { motion } from 'framer-motion';

const Loading = ({
  type = 'spinner', // 'spinner', 'dots', 'progress', 'fullscreen'
  size = 100,
  color = '#0ea5e9',
  text = '',
  progress = 0,
  steps = [],
  activeStep = 0,
  className = ''
}) => {
  // Spinner variant
  const renderSpinner = () => (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <motion.circle
          cx="50"
          cy="50"
          r={size / 3}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="70, 150"
          initial={{ pathLength: 0.7, pathOffset: 1 }}
          animate={{ 
            pathLength: [0.7, 1, 0.7],
            pathOffset: [1, 0, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={size / 4}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeDasharray="50, 100"
          initial={{ pathLength: 0.5, pathOffset: 0 }}
          animate={{ 
            pathLength: [0.5, 0.8, 0.5],
            pathOffset: [0, 1, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
      </svg>
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div 
          className="rounded-full" 
          style={{ 
            backgroundColor: color,
            width: size / 8,
            height: size / 8
          }} 
        />
      </motion.div>
    </motion.div>
  );

  // Dots variant
  const renderDots = () => (
    <div className="flex items-center justify-center space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ 
            backgroundColor: color,
            width: size / 3,
            height: size / 3
          }}
          animate={{
            y: [0, -size/4, 0],
            opacity: [0.6, 1, 0.6]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );

  // Progress bar variant
  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );

  // Fullscreen variant
  const renderFullscreen = () => (
    <motion.div 
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative mb-8">
        {renderSpinner()}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="bg-white rounded-full p-2 shadow-lg">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center">
              <span className="text-gray-500 text-xs">Logo</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {text && (
        <motion.h2 
          className="text-2xl font-bold text-gray-800 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.h2>
      )}
      
      {steps.length > 0 && (
        <div className="flex flex-col gap-3 max-w-md w-full mb-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className={`flex items-center p-4 rounded-xl shadow-md ${
                activeStep === index ? 'bg-blue-500' : 'bg-white'
              } transition-colors duration-500`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                backgroundColor: activeStep === index ? color : '#fff'
              }}
              transition={{ 
                delay: 0.3 + index * 0.1,
                duration: 0.5
              }}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {activeStep === index ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                ) : (
                  <div 
                    className="rounded-full bg-gray-300"
                    style={{ width: size/8, height: size/8 }}
                  ></div>
                )}
              </div>
              <span className={`font-medium ${activeStep === index ? 'text-white' : 'text-gray-700'}`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      )}
      
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ 
            duration: 5, 
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </div>
    </motion.div>
  );

  // Return the appropriate variant based on type prop
  switch (type) {
    case 'dots':
      return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
          {renderDots()}
          {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
        </div>
      );
      
    case 'progress':
      return (
        <div className={`w-full ${className}`}>
          {text && <p className="mb-2 text-gray-600 text-sm">{text}</p>}
          {renderProgressBar()}
        </div>
      );
      
    case 'fullscreen':
      return renderFullscreen();
      
    case 'spinner':
    default:
      return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
          {renderSpinner()}
          {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
        </div>
      );
  }
};
export default Loading;