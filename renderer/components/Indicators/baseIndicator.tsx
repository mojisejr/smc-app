
interface IndicatoProps {
    title: string;
    value: number;
    unit: string;
}

const Indicator = ({title,value,unit}: IndicatoProps) => {
    return <>
    <div className="w-full flex flex-col items-center px-2">
    <div className="text-sm">{title}</div>
    <progress className="progress progress-primary" value={value} max="100"></progress>
    <div className="text-sm">{`${value}${unit}`}</div>
    </div>
    </>
}

export default Indicator;