import type { CSSProperties } from "react";

const innerOrbit = ["TypeScript", "C#", "Go", "Python"];
const outerOrbit = ["React", ".NET", "PostgreSQL", "Docker", "Redis", "Nginx"];

type OrbitStyle = CSSProperties & { "--index": number; "--count": number };

function orbitStyle(index: number, count: number): OrbitStyle {
  return {
    "--index": index,
    "--count": count
  };
}

export function RotatingEarth() {
  return (
    <div className="hero-earth hero-earth--2d" aria-hidden>
      <div className="earth-orbits">
        <div className="earth-core">
          <div className="earth-core__atmosphere" />
          <div className="earth-map">
            <div className="earth-land earth-land--north-america" />
            <div className="earth-land earth-land--south-america" />
            <div className="earth-land earth-land--eurasia" />
            <div className="earth-land earth-land--africa" />
            <div className="earth-land earth-land--australia" />
            <div className="earth-land earth-land--greenland" />
          </div>
          <div className="earth-clouds">
            <span className="earth-cloud earth-cloud--one" />
            <span className="earth-cloud earth-cloud--two" />
            <span className="earth-cloud earth-cloud--three" />
          </div>
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
