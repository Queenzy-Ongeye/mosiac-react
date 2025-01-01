// Notification.js
import React, { useEffect } from "react";

const Notification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // Auto-hide after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-oves-blue text-white px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
};

export default Notification;
