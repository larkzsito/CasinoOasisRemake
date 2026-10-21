import React from "react";
import Header from "../../layout/Header";

export default function GameHeader({title,name,balance,back}:{title:string;name:string;balance:number;back:()=>void}) {
  return <Header logged name={name} balance={balance} active="game" onNav={back}/>;
}