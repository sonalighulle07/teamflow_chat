import { Download, Pencil } from "lucide-react";
import { useState } from "react";

export default function OrganizationSettings() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgName, setOrgName] = useState("Gsoft");
  const [tempName, setTempName] = useState(orgName);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Selected file:", file);
      // You can handle the uploaded file here
      setShowUploadModal(false); // close modal after selecting
    }
  };

  const handleOrgUpdate = () => {
    setOrgName(tempName);
    setShowOrgModal(false);
  };

  return (
    <div className="bg-[#F0F4FA] min-h-screen pt-0 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {/* Organization Settings (Top Box) */}
      <div className="bg-white rounded-[12px] pl-7 p-5 shadow-sm">
        <h3 className="text-[15px] text-gray-600 mb-3">
          Organization Settings
        </h3>

        <div className="flex items-start gap-6">
          {/* Logo Placeholder */}
          <div className="relative w-36 h-16 border border-[#C5C2C2] rounded-[3px] flex items-center justify-center text-gray-400 text-xs">
            Logo
            {/* Camera/Upload Icon */}
            <button
              className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100"
              onClick={() => setShowUploadModal(true)}
            >
              <img
                src="/Icons/Vector.png" // your camera image path
                alt="Camera"
                className="w-4 h-4 object-contain"
              />
            </button>
          </div>

          {/* Organization Name */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Organization Name
              <Pencil
                size={15}
                className="cursor-pointer"
                onClick={() => {
                  setTempName(orgName); // pre-fill input
                  setShowOrgModal(true);
                }}
              />
            </div>
            <p className="text-gray-500 mt-1">{orgName}</p>
          </div>
        </div>

        {/* Plan & Usage */}
        <div className="mt-6">
          <h4 className="text-[15px] text-gray-600 mb-2">Plan & Usage</h4>

          {/* in one line */}
          <div className="flex gap-6 flex-wrap">
            <div className="text-sm text-gray-500">Current Plan</div>
            <div className="text-gray-600 text-sm ml-44">Pro</div>
            <div className="text-sm text-gray-500 ml-18">Plan Expiry</div>
            <div className="text-gray-600 text-sm ml-46">24 Aug 2026</div>
          </div>

          {/* Media & Users Usage below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 mr-30">
            {/* Media Usage */}
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-500">Media limit Used</span>
                <span>28 MB / 50 MB</span>
              </div>
              <div className="w-full h-2 bg-[#D9D9D9] rounded-full mt-3 ">
                <div className="h-2 w-[56%] bg-[#236CF5] rounded-full" />
              </div>
            </div>

            {/* Users Usage */}
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-500">Users Used</span>
                <span>30 MB / 50 MB</span>
              </div>
              <div className="w-full h-2 bg-[#D9D9D9] rounded-full mt-3">
                <div className="h-2 w-[60%] bg-[#236CF5] rounded-full" />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 mr-30">
            <button className="border border-[#999696] px-7 py-1.5 bg-[#EFEFEF] rounded-[8px] text-[12.5px] text-[#555555] hover:bg-gray-50">
              Request Plan Change
            </button>
          </div>
        </div>
      </div>

      {/* Billing & Invoices (Bottom Box) */}
      <div className="bg-white rounded-[12px] pt-5 p-6 shadow-sm overflow-hidden">
        <h3 className="text-sm text-gray-500 mb-4">Billing & Invoices</h3>

        <div className="overflow-x-auto">
          <div className="max-h-[130px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#F2F2F2] text-[#635E5E] sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Invoice ID</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Plan</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {[...Array(20)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">786</td>
                    <td className="px-4 py-2">02/09/25</td>
                    <td className="px-4 py-2">Pro</td>
                    <td className="px-4 py-2">₹50000</td>
                    <td className="px-4 py-2">
                      <button className="flex items-center gap-2 bg-[#7D92FD] text-white px-3 py-1.5 rounded-[4px] text-xs hover:bg-[#6a83ff]">
                        <Download size={14} /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center bg-[#F2F2F2] items-center gap-2 text-sm text-[#797979] mt-4">
          showing 4 of 20
          <span className="text-lg">›</span>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white h-[192px] p-6 w-[431px] relative rounded-[5px]">
            <button
              className="absolute top-3 right-4 text-[11px] text-gray-400 font-bold hover:text-gray-700"
              onClick={() => setShowUploadModal(false)}
            >
              ✕
            </button>

            <div className="flex flex-col items-center justify-center gap-4 mt-2">
              {/* Upload Image */}
              <div className="w-12 h-12 flex items-center justify-center rounded-full  bg-gray-50">
                <img
                  src="/Icons/Group 41.png" // your image path
                  alt="Upload Icon"
                  className="h-12 w-12 object-contain"
                />
              </div>

              <p className="text-[#939393] text-[15px]">
                Choose a file to upload your logo.
              </p>

              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="logoUpload"
              />
              <label
                htmlFor="logoUpload"
                className="cursor-pointer border border-[#BDBDBD] text-[#adadad] mt-2 mb-2 px-7 py-0.5 rounded-[5px] text-sm hover:bg-gray-50"
              >
                Upload
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Organization Name Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowOrgModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-[8px] p-6 shadow-lg z-10">
            <h3 className="text-sm text-gray-500 mb-3">Organization Name</h3>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full border border-gray-300 rounded-full pl-2 p-1 text-gray-500 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-200"
            />
            <div className="mt-7 flex justify-end">
              <button
                onClick={() => setShowOrgModal(false)}
                className="mr-2  text-[14px] px-6 py-1 rounded-[8px] border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleOrgUpdate}
                className="px-6  rounded-[8px] text-[14px] py-1 bg-[#236CF5] text-white hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
