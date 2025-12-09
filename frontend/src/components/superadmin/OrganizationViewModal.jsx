import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";
import { FiX, FiMail, FiPhone, FiMapPin, FiCheckCircle } from "react-icons/fi";

export default function OrganizationViewModal({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("chatToken");

  const loadDetails = async () => {
    try {
      const res = await axios.get(
        `${URL}/super-admin/organizations/${id}/details`,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      setData(res.data);
    } catch (err) {
      console.error("Details Load Error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadDetails();
  }, [id]);

  if (!id) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative w-[420px] p-6 rounded-2xl bg-white shadow-[0_8px_25px_rgba(0,0,0,0.12)] border border-gray-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-800 transition text-xl"
        >
          <FiX />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 text-center mb-4">
          Organization Details
        </h2>

        {loading && (
          <p className="text-center text-sm text-gray-500">Loading...</p>
        )}

        {!loading && data?.organization && (
          <div className="space-y-3">

            {/* ORG NAME */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500">Organization</p>
              <p className="text-[15px] font-medium text-gray-900">
                {data.organization.name}
              </p>
            </div>

            {/* EMAIL */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <FiMail className="text-blue-600 text-lg" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-800">
                  {data.organization.email}
                </p>
              </div>
            </div>

            {/* CONTACT */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <FiPhone className="text-green-600 text-lg" />
              <div>
                <p className="text-xs text-gray-500">Contact</p>
                <p className="text-sm text-gray-800">
                  {data.organization.contact}
                </p>
              </div>
            </div>

            {/* ADDRESS */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <FiMapPin className="text-red-500 text-lg" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-gray-800">
                  {data.organization.address}
                </p>
              </div>
            </div>

            {/* STATUS */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <FiCheckCircle
                className={`text-lg ${
                  data.organization.status === "active"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p
                  className={`text-sm font-medium ${
                    data.organization.status === "active"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {data.organization.status}
                </p>
              </div>
            </div>

          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 mt-5 rounded-lg font-medium 
          bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
