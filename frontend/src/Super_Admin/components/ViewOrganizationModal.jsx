import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";

export default function ViewOrganizationModal({ orgId, onClose }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  
  useEffect(() => {
    if (!orgId) return;

    const fetchDetails = async () => {
      try {
        const res = await axios.get(
          `${URL}/super-admin/organizations/${orgId}/details`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrg(res.data.organization);
      } catch (err) {
        console.error("Fetch org error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [orgId]);

  if (!orgId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full max-w-[400px] bg-white rounded-lg shadow-xl p-7  ">
        <h3 className="text-lg font-medium text-gray-600 mb-5 ">
          Organization Details
        </h3>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 gap-x-5 flex-nowrap text-sm text-gray-600">
            <p>
              <span className="font-medium">Name :</span> {org.name}
            </p>
            <p>
              <span className="font-medium">Email :</span> {org.email}
            </p>

            <p>
              <span className="font-medium">Domain :</span> {org.domain}
            </p>
            <p>
              <span className="font-medium">Package :</span> {org.plan}
            </p>

            <p>
              <span className="font-medium">Status :</span>
              <span
                className={`inline-block w-2 h-2 rounded-full mr-1 ml-2 ${
                  org.status === "active" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={
                  org.status === "active" ? "text-green-500" : "text-red-500"
                }
              >
                {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
              </span>
            </p>

            <p>
              <span className="font-medium">Start date :</span>{" "}
              {org.plan_start_date
                ? new Date(org.plan_start_date).toLocaleDateString("en-GB")
                : "-"}
            </p>
            <p>
              <span className="font-medium">Expiry date :</span>{" "}
              {org.plan_end_date
                ? new Date(org.plan_end_date).toLocaleDateString("en-GB")
                : "-"}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-5 text-gray-400 hover:text-gray-600 text-[13px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
