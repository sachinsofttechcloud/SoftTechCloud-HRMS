export default function Container({ children, className, ...props }) {
    return (
        <div className={`flex flex-col flex-1 p-10 md:p-16 w-full ${className}`} {...props}>
            {children}
        </div>
    )
}