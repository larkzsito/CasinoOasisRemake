export default function Box({label,value}:{label:string;value:string}){
  return <div className="box"><span>{label}</span><b>{value}</b></div>;
}