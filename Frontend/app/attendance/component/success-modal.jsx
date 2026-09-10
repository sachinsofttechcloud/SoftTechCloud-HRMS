import Description from "@/app/atoms/description";
import Heading from "@/app/atoms/heading";
import { CheckCircle2 } from "lucide-react";

export default function SuccessModal({ message, onClose }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl border border-blue-500/30 bg-[#0f172a] p-6 shadow-2xl text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <CheckCircle2 size={28} />
                </div>
                <div>
                    <Heading className="!text-base !font-bold !text-white font-inter">
                        Success!
                    </Heading>
                    <Description className="!text-xs !text-slate-400 mt-1">
                        {message}
                    </Description>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition shadow-lg shadow-blue-500/20"
                >
                    Done
                </button>
            </div>
        </div>
    );
}