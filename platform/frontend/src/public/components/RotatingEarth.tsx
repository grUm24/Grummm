import type { CSSProperties } from "react";

const innerOrbit = ["TypeScript", "C#", "Go", "Python"];
const outerOrbit = ["React", ".NET", "PostgreSQL", "Docker", "Redis", "Nginx"];

type OrbitStyle = CSSProperties & { "--orbit-angle": string };

function orbitStyle(index: number, count: number): OrbitStyle {
  return {
    "--orbit-angle": `${(360 / count) * index}deg`
  };
}

export function RotatingEarth() {
  return (
    <div className="hero-earth hero-earth--2d" aria-hidden>
      <div className="earth-orbits">
        <div className="earth-core">
          <div className="earth-core__atmosphere" />
          <div className="earth-core__rim" />
          <div className="earth-map">
            <div className="earth-land earth-land--north-america" />
            <div className="earth-land earth-land--central-america" />
            <div className="earth-land earth-land--south-america" />
            <div className="earth-land earth-land--greenland" />
            <div className="earth-land earth-land--eurasia" />
            <div className="earth-land earth-land--europe" />
            <div className="earth-land earth-land--arabia" />
            <div className="earth-land earth-land--africa" />
            <div className="earth-land earth-land--madagascar" />
            <div className="earth-land earth-land--australia" />
            <div className="earth-land earth-land--antarctica" />
          </div>
          <div className="earth-clouds">
            <span className="earth-cloud earth-cloud--one" />
            <span className="earth-cloud earth-cloud--two" />
            <span className="earth-cloud earth-cloud--three" />
            <span className="earth-cloud earth-cloud--four" />
          </div>
          <div className="earth-core__lights" />
          <div className="earth-core__shade" />
        </div>

        <ul className="orbit orbit--inner">
          {innerOrbit.map((label, index) => (
            <li key={label} style={orbitStyle(index, innerOrbit.length)}>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <ul className="orbit orbit--outer">
          {outerOrbit.map((label, index) => (
            <li key={label} style={orbitStyle(index, outerOrbit.length)}>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}