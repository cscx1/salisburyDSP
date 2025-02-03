/** @type {import('tailwindcss').Config} */
export default {
  content: [ "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

/** (venv) jannetzane@jannets-MacBook-Air DSP % npx tailwindcss -i ./src/index.css -o ./dist/output.css --watch


Rebuilding...

Done in 383ms.
^C
(venv) jannetzane@jannets-MacBook-Air DSP % npm install -D tailwindcss postcss autoprefixer


up to date, audited 357 packages in 3s

133 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
(venv) jannetzane@jannets-MacBook-Air DSP % npx tailwindcss init -p


tailwind.config.js already exists.
Created PostCSS config file: postcss.config.js
(venv) jannetzane@jannets-MacBook-Air DSP % npm run dev

> dsp@0.0.0 dev
> vite


  VITE v6.0.11  ready in 633 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
^C
(venv) jannetzane@jannets-MacBook-Air DSP %  */