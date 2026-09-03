
export default function Description({ children, className = "", ...props}){

    return (
        <p className={`text-[14px] xl:text-[18px] font-inter font-[400px] ${className}`} {...props}>
            {children}
        </p>
    )
}