import { TbTemperatureCelsius } from "react-icons/tb";
import { WiHumidity } from "react-icons/wi";
interface IndicatoProps {
  title: string;
  value: number;
  unit: string;
  threshold: number;
}

const Indicator = ({ title, value, unit, threshold }: IndicatoProps) => {
  return (
    <>
      <div className="w-full flex items-center px-2">
        {unit === "*C" ? (
          <TbTemperatureCelsius size={20} />
        ) : (
          <WiHumidity size={20} />
        )}
        <div className="p-1 bg-gray-200 text-xs font-semibold">{`${value}`}</div>
      </div>
    </>
  );
};

export default Indicator;
