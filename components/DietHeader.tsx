"use client";
import React from "react";

const DietHeader = () => {
  return (
    <div
      className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white rounded-lg shadow-md mb-8 w-full border-2 border-purple-700"
      style={{
        boxShadow:
          "0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <h2 className="text-2xl font-bold text-center">
        Kişiye Özel Beslenme Programı
      </h2>
      <p className="text-sm text-center mt-2 text-blue-100 max-w-3xl mx-auto">
        Bu program kişinin ihtiyaçlarına göre özel olarak hazırlanmıştır. Lütfen
        tüm bilgileri eksiksiz doldurunuz.
      </p>
    </div>
  );
};

export default DietHeader;
