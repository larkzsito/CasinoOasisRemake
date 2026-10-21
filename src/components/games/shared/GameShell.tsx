import React from "react";
import GameHeader from "./GameHeader";
import Chat from "./Chat";

export default function GameShell({
  title,
  name,
  balance,
  back,
  showChat = false,
  tableStyle,
  tableClassName,
  children,
}: {
  title: string;
  name: string;
  balance: number;
  back: () => void;
  showChat?: boolean;
  tableStyle?: React.CSSProperties;
  tableClassName?: string;
  children: React.ReactNode;
}) {
  const isVip = title.toLowerCase().includes("vip");

  return (
    <>
      <GameHeader title={title} name={name} balance={balance} back={back}/>
      <div className="game-shell">
        <div className="game-topbar">
          <div className="title-block">
            <b>{title}</b><span>{isVip ? "MESA PRIVADA VIP · EXCLUSIVA" : "MESA PRIVADA · DEMO"}</span>
          </div>
          <button className="btn-back-lobby" onClick={back}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span>Volver al Lobby</span>
          </button>
        </div>
        <div className={`game-layout${showChat ? "" : " no-chat"}`}>
          <div className={`table-panel ${tableClassName || ""}`} style={tableStyle}>
            {children}
          </div>
          {showChat && <Chat game={title} currentUserName={name} isVip={isVip} />}
        </div>
      </div>
    </>
  );
}