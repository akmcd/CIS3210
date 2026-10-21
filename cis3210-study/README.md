# CIS*3210 midterm study site

A static study site for CIS*3210 Computer Networks (Fall 2026, Sajid Marhon), covering Week 0 through Reliable Data Transfer (October 20). No build step, no dependencies.

- **Read** (`read.html`): eleven topics from the slides and Kurose & Ross (Ch. 1, 2.1–2.4, 2.6, 3.1–3.4), a cheat sheet, and nine step-through demos (encapsulation, DNS resolution, HTTP RTT counting, head-of-line blocking, demultiplexing, the UDP checksum, rdt3.0, utilization, Go-Back-N vs Selective Repeat).
- **In-class questions** (`review.html`): the prof's 26 questions from October 1–20, each with a worked answer hidden until you open it, and a done checklist.
- **Textbook checks** (`knowledge.html`): a practice quiz for each of the 12 textbook sections the midterm covers: 6 original questions per section (single-answer, select-all, matching, scenario; data in `data/kc.js`) plus 4 drawn from the topic quizzes, with an explanation for every choice. Completion is recorded when you finish a section. Links to the official Kurose & Ross knowledge checks are kept as a secondary option.
- **Flashcards** (`flashcards.html`): 113 cards by topic. Marks the ones you know.
- **Quizzes** (`quiz.html`): 168 questions by topic (142 topic questions plus the 26 in-class questions turned into quiz form), with an explanation after each answer. About one in five are "select all that apply", and those explain every choice after you answer.
- **Practice exam** (`exam.html`): 50 questions with a 60- or 75-minute timer, or none. Exam A is 50 questions not used anywhere else; Exam B draws 50 from the quiz bank; Exam C is all 26 in-class questions plus 24 others. Results are broken down by topic and question type.

Progress (known cards, best quiz scores, exam history, an exam in progress) is saved in your browser's local storage. Nothing is sent anywhere.

## Set the exam date

Open `assets/common.js` and change the line near the top:

```js
const EXAM_DATE = null;
```

to, for example:

```js
const EXAM_DATE = new Date('2026-10-29T00:00:00-04:00');
```

The home page then shows the date and a countdown.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example `cis3210-midterm`). Free accounts need it public for Pages.
2. Upload every file in this folder to the repository root, keeping the `assets/` and `data/` folders and the empty `.nojekyll` file.
   - From the command line:
     ```bash
     cd cis3210-study
     git init
     git add .
     git commit -m "Study site"
     git branch -M main
     git remote add origin https://github.com/<your-username>/cis3210-midterm.git
     git push -u origin main
     ```
   - Or on github.com: **Add file → Upload files**, then drag in the folder's contents.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick **main** and **/ (root)**, and save.
4. After a minute or two the site is live at `https://<your-username>.github.io/cis3210-midterm/`.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Editing content

- Flashcards: `data/flashcards.js`
- Quiz questions: `data/bank.js`
- Practice Exam A: `data/exam.js`
- In-class questions (quiz versions and worked answers): `data/review.js`

Each question has `id`, `topic`, `kind` (`concept`, `scenario`, `calc` or `code`), `q`, optional `code` (shown as a block), `options`, `answer` and `why`. `answer` is the index of the correct option, or an array of indices for a "select all that apply" question. Options are shuffled when shown, so the stored order doesn't matter. Wrap code words in backticks and use `**bold**` for emphasis.

Topic keys: `intro`, `internet`, `apps`, `http`, `dns`, `email`, `sockets`, `transport`, `udp`, `rdt`, `pipeline`, `review`.

The site uses Atkinson Hyperlegible and JetBrains Mono from Google Fonts and falls back to system fonts offline.
