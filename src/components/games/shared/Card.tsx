export default function Card({text}:{text:string}){
  return <div className={`pcard ${text.includes("♥")||text.includes("♦")?"red":"black"}`}>
    <span>{text.slice(0,-1)}</span><span>{text.slice(-1)}</span>
  </div>;
}