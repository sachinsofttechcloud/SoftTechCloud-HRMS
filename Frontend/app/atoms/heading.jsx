

export default function Heading({ children, className = "", ...props}){

    return (
        <h1 className={`text-[24px] xl:text-[44px] font-bold font-merri text-gray-900 ${className}`} {...props}>
            {children}
        </h1>
    )
}