import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const MeetingGuard = ({ children }) => {
  const location = useLocation();

  // Check if navigation came from /prejoin
  const fromPrejoin = location.state?.fromPrejoin;

  if (!fromPrejoin) {
    // Block direct access to /meet/:code
    return <Navigate to="/" replace />;
  }

  return children;
};

export default MeetingGuard;
