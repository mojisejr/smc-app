interface IndicatoProps {
  title: string;
  value: number;
  unit: string;
  threshold: number;
}

const Indicator = ({ title, value, unit, threshold }: IndicatoProps) => {
  return (
    <>
      <div className="w-full flex flex-col items-center px-2">
        <div className="text-xs">{title}</div>
        <progress
          className={`progress ${
            value < threshold ? "progress-info" : "progress-error"
          }`}
          value={value}
          max="100"
        ></progress>
        <div className="text-xs">{`${value}${unit}`}</div>
      </div>
    </>
  );
};

export default Indicator;
