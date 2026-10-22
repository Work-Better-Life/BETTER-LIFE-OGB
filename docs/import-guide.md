# Preparing a spreadsheet to import

There are two imports. Both accept **Excel (.xlsx, .xls), OpenDocument (.ods) or CSV**,
and both work the same way: you upload the file, the app **checks it and lists every
problem**, and **nothing is saved until the file is clean**. Fix what it lists, upload
again, and click Import.

| Import | Where | Example file |
|---|---|---|
| Student registrations | Students → Import | `students-sample.csv` / `.xlsx` |
| Test scores | Dashboard → Record a test → Import file | `scores-sample.csv` / `.xlsx` |

The example files are in `public/import-samples/` and are linked from each import page.
They go together: import `students-sample` first, then `scores-sample` matches those
same four students. The sample students all say "SAMPLE ROW" in their notes, so they're
easy to spot (and **Recent imports → Undo** removes them) if one is imported by mistake.

---

## 1. Student registration file

Start from the **template** (headings only) on the import page, or copy the headings from
the example. Keep the heading text as it is. One student per row. Extra columns the app
doesn't know (for example a form's *Timestamp* or *Attendance*) are ignored, and blank
rows are skipped.

| Column | Required? | What to put |
|---|---|---|
| Full Name | Yes | First name, then surname — at least two words. `Ada Okafor` or `Ada OKAFOR`. Everything after the first word is the surname. |
| Gender | Yes | `Female` or `Male` |
| Date of Birth | Yes | A date. Best written `2008-03-14` (see *Dates* below). |
| House Address | No | Free text |
| Name of Secondary School you attend | Yes | Free text |
| School Address / Area | Yes | Free text |
| Current Class | Yes | `SS2`, `SS3`, or `Graduated Secondary (Resitting JAMB)` |
| Select four core subjects currently offered | Yes | **Exactly four**, separated by commas, from the list below |
| Which subjects do you struggle with the most? | Yes | **At least one**, from the same list, separated by commas |
| Have you ever written a Computer-Based Test (CBT)? | Yes | `Yes` or `No` |
| How comfortable are you with using a computer? | Yes | A whole number from `1` (not comfortable) to `5` (very) |
| When are you planning to sit for JAMB? | Yes | `2026` or `2027` |
| What score range are you aiming for in JAMB? | Yes | Free text, e.g. `250-280` |
| Have you attended any JAMB extra lessons or tutorials before this time? | Yes | `Yes` or `No` |
| What is your biggest challenge with exams right now, especially CBT? | No | Free text |
| Would you be willing to take exams under strict CBT conditions without shortcuts? | Yes | `Yes` or `No` |
| Will you be willing to attend follow up classes … proper? | No | `Yes`, `No`, or leave blank |
| Can you commit to attending multiple mock exams and follow-up sessions? | Yes | `Yes` or `No` |
| Why do you want to be part of this program? | Yes | Free text |
| Parent/Guardian/Sponsor Full Name | Yes | Free text |
| Address | Yes | The parent/guardian's address |
| Phone Number | Yes | Keep the leading zero (see *Phone numbers* below) |
| Email Address | No | A valid email, or leave blank |
| Confirm you are aware and support your child's/ward's participation in this program? | Yes | `Yes` or `No` |
| Do you consent to performance data being used strictly for academic analysis and improvement? | Yes | `Yes` or `No` |
| Any additional information you would like us to know? | No | Free text |
| University they are applying for | Yes | Free text |
| Course they wish to study | Yes | Free text |
| Status | No | `admitted`, `deferred` or `drop-out`. Blank means admitted. |
| Date joined | No | A date. Blank uses the form's Timestamp if there is one, otherwise today. |

**Subjects** (use these names exactly): English Language, Mathematics, Physics, Chemistry,
Biology, Economics, Financial Accounting, Literature in English, CRS, Government.

In a CSV a cell that contains commas must be wrapped in quotes — Excel and Google Sheets
do this for you when you save as CSV, so just type `English Language, Mathematics, Physics, Chemistry`
into one cell.

**Choosing a cohort:** the import page asks which cohort to put everyone in. The cohort
isn't a column in the file.

**Someone already in the app** (same name and date of birth) is left alone and listed as
"Already in the app". It doesn't block the import, so you can keep adding late joiners to
the same sheet.

**Undo:** an import can be undone from *Recent imports* on the same page, as long as none of
those students has scores yet.

---

## 2. Test scores file

```
S/N,Name,Mathematics (10),English (10),Biology (10),Physics (10),Chemistry (10),Total (50)
1,Ada EXAMPLE,8,7.5,9,6,8,38.5
4,Emeka MODEL STUDENT,ABSENT,ABSENT,ABSENT,ABSENT,ABSENT,-
```

- **Headings in row 1.** (A title or a few blank rows above the headings is fine — the app
  finds the heading row.)
- **Name** column: the student's first name and surname, in either order, any capitals.
  They're matched against the students in the cohort you choose on the import page.
- **One column per subject, with the max score in brackets:** `Mathematics (10)`. The subject
  name must match a subject in the app **exactly** (so `Mathematics`, not `Maths`), and the
  max must be a whole number. The max comes from here — there's no separate box for it.
- **Scores:** a number, decimals allowed (`7.5`), and not above the max.
- **Absent:** write `ABSENT` (or `ABS`/`AB`). It's saved as a score of **0**.
- **Blank cells are not allowed** — a blank might be a forgotten score, so it's flagged. Write
  `ABSENT` if the student missed it.
- **Total column** (optional): if present it must equal the sum of the subjects. Use `-` for
  an absent student. Columns like `S/N` are ignored.
- **The test name and the date are typed on the import page**, not in the file. Give each test
  its own name (`Week 8`) so results stay separate.

---

## 3. Tips

**Dates.** Write dates as **`2008-03-14`** (year-month-day) and they can never be misread.
`03/04/2008` could mean 3 April or March 4, so the import page has a setting for which way to
read it; it only matters for dates typed as text and for CSV files. A day above 12
(`25/04/2008`) is always read correctly. Real Excel date cells are read exactly as stored.

**Phone numbers.** Excel drops the leading zero from a number (`08012345678` becomes
`8012345678`). Before typing phone numbers, select the column and set its format to **Text**.
The example `.xlsx` already does this.

**Saving as CSV from Excel:** use *CSV UTF-8*. Names with accents then stay intact.

**Unsure?** Use *Check file* — it never saves anything. It lists all problems at once.

---

## 4. What the messages mean

| Message | Fix |
|---|---|
| Couldn't find column(s) for: university, course | Add the missing column(s) with the template's headings |
| Select exactly four core subjects | The *four core subjects* cell must have four subjects from the list |
| Full name needs a first and last name | Put both names in the cell |
| Date joined "…" isn't a date I can read | Write it like `2026-10-01`, or leave it blank |
| This student appears more than once in the file | Same name and date of birth twice — remove one row |
| There's no subject called "Maths" | Rename the heading to the app's subject name, e.g. `Mathematics (10)` |
| Column "Mathematics" has no max score | Add the max: `Mathematics (10)` |
| … 12 is higher than the max of 10 | Correct the score, or the max in the heading |
| … is blank | Enter the score, or `ABSENT` |
| The scores add up to 35.5 but the Total column says 34.5 | One of the scores or the Total is wrong — fix it |
| No student named "…". Did you mean … | Fix the spelling to match the student in the app |
| Not in cohort 2026 — but a student with this name is in cohort 2027 | You chose the wrong cohort on the import page |
| Already has scores for "Week 8" on … | That test was already imported for that student — remove the row, or Undo the earlier import |
| "Week 8" already exists in Physics with a max of 50 | Use a different test name, or fix the max in the heading |
