// npm run seed  -> demo users, 15 connected tuitions, applications, payments.
// Safe to re-run: tuitions/applications/payments are reset, users are created only if missing.
import { auth } from "./auth.js";
import { client, users, tuitions, applications, payments, ensureIndexes } from "./db.js";

const PASSWORD = process.env.SEED_PASSWORD || "Mentor@123";
const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`;

const people = [
  { name: "Admin MentorLagbe", email: "admin@mentorlagbe.com", role: "admin" },
  { name: "Imran Hossain", email: "tutor@mentorlagbe.com", role: "tutor" },
  { name: "Dr. Farhana Rahman", email: "farhana@mentorlagbe.com", role: "tutor" },
  { name: "Nusrat Jahan", email: "nusrat@mentorlagbe.com", role: "tutor" },
  { name: "Tanvir Ahmed", email: "tanvir@mentorlagbe.com", role: "tutor" },
  { name: "Rafi Chowdhury", email: "student@mentorlagbe.com", role: "student" },
  { name: "Sadia Islam", email: "sadia@mentorlagbe.com", role: "student" },
];

// title, subject, classLevel, mode, location, fee, days/week, tutor index (1-4), approval
const T: [string, string, string, string, string, number, number, number, string][] = [
  ["HSC Higher Math Crash Batch", "Mathematics", "HSC", "Offline", "Dhanmondi, Dhaka", 3500, 4, 1, "approved"],
  ["SSC Physics Concept Builder", "Physics", "SSC", "Online", "Zoom (live)", 2200, 3, 2, "approved"],
  ["Python for Beginners, 1-on-1 Mentorship", "Programming", "University", "Online", "Google Meet", 4000, 3, 4, "approved"],
  ["IELTS Band 7+ Speaking and Writing", "IELTS", "Professional", "Online", "Zoom (live)", 5000, 4, 3, "approved"],
  ["Class 8 Science and Math Foundation", "Mathematics", "Class 6-8", "Offline", "Mirpur 10, Dhaka", 1800, 5, 1, "approved"],
  ["HSC Chemistry Organic Mastery", "Chemistry", "HSC", "Offline", "Uttara, Dhaka", 3000, 3, 2, "approved"],
  ["Spoken English for Job Seekers", "English", "Professional", "Online", "Google Meet", 2500, 3, 3, "approved"],
  ["Medical Admission Biology Program", "Biology", "Admission", "Offline", "Banani, Dhaka", 4500, 5, 2, "approved"],
  ["JavaScript and React Project Mentoring", "Programming", "University", "Online", "Discord (live)", 4500, 2, 4, "approved"],
  ["Engineering Admission Math Sprint", "Mathematics", "Admission", "Online", "Zoom (live)", 3800, 5, 1, "approved"],
  ["Class 6-8 English Grammar Lab", "English", "Class 6-8", "Offline", "Gulshan, Dhaka", 1500, 3, 3, "approved"],
  ["University Statistics and Data Analysis", "Statistics", "University", "Online", "Google Meet", 3200, 2, 4, "approved"],
  ["SSC ICT Practical Batch", "ICT", "SSC", "Offline", "Mohammadpur, Dhaka", 2000, 3, 1, "pending"],
  ["HSC Accounting Weekend Class", "Accounting", "HSC", "Offline", "Motijheel, Dhaka", 2600, 2, 2, "pending"],
  ["Advanced Calculus Quick Notes", "Mathematics", "University", "Online", "Zoom (live)", 2800, 2, 4, "rejected"],
];

async function ensureUser(p: (typeof people)[number]) {
  let u = await users.findOne({ email: p.email });
  if (!u) {
    await auth.api.signUpEmail({ body: { name: p.name, email: p.email, password: PASSWORD, role: p.role === "tutor" ? "tutor" : "student" } as any });
    u = await users.findOne({ email: p.email });
  }
  await users.updateOne({ email: p.email }, { $set: { role: p.role, name: p.name, emailVerified: true, image: img(p.email.split("@")[0]) } });
}

async function main() {
  for (const p of people) await ensureUser(p);
  await ensureIndexes();
  await Promise.all([tuitions.deleteMany({}), applications.deleteMany({}), payments.deleteMany({})]);

  const tutors = people.filter((p) => p.role === "tutor");
  const now = Date.now();
  const docs = T.map(([title, subject, classLevel, mode, location, monthlyFee, daysPerWeek, ti, approvalStatus], i) => ({
    title, subject, classLevel, mode, location, monthlyFee, daysPerWeek,
    bannerImage: img(`${subject}-${i}`.toLowerCase()),
    description: `${title}. A focused ${subject} program for ${classLevel} learners, ${daysPerWeek} days a week (${mode.toLowerCase()}). Weekly tests, personal feedback on every assignment, and doubt-clearing sessions so each student keeps improving steadily.`,
    tutorName: tutors[ti - 1].name, tutorEmail: tutors[ti - 1].email, tutorImage: img(tutors[ti - 1].email.split("@")[0]),
    approvalStatus, isActive: true, createdAt: new Date(now - i * 86400000),
  }));
  const ins = await tuitions.insertMany(docs);
  const ids = Object.values(ins.insertedIds);

  const apps = [
    { t: 0, who: 5, status: "accepted" }, { t: 2, who: 5, status: "pending" }, { t: 3, who: 5, status: "rejected" },
    { t: 1, who: 6, status: "pending" }, { t: 0, who: 6, status: "pending" }, { t: 8, who: 6, status: "accepted" },
  ].map((a, i) => ({
    tuitionId: ids[a.t].toString(), tuitionTitle: docs[a.t].title, subject: docs[a.t].subject, monthlyFee: docs[a.t].monthlyFee,
    tutorName: docs[a.t].tutorName, tutorEmail: docs[a.t].tutorEmail,
    studentName: people[a.who].name, studentEmail: people[a.who].email, studentPhone: `01700-00000${i}`,
    preferredSchedule: "Sat, Mon, Wed - 6:00 PM", studentNote: "I want to improve my results before the exam.",
    status: a.status, appliedAt: new Date(now - i * 3600000 * 5),
  }));
  await applications.insertMany(apps);

  const pro = [{ p: people[1], amount: 15, role: "tutor" }, { p: people[6], amount: 10, role: "student" }];
  for (const [i, x] of pro.entries()) {
    await payments.insertOne({
      userEmail: x.p.email, userName: x.p.name, userRole: x.role, planName: `MentorLagbe Pro ${x.role === "tutor" ? "Tutor" : "Student"} Plan`,
      amount: x.amount, currency: "usd", transactionId: `pi_seed_00${i + 1}`, stripeSessionId: `cs_seed_00${i + 1}`, paymentStatus: "paid", paidAt: new Date(now - i * 86400000 * 2),
    });
    await users.updateOne({ email: x.p.email }, { $set: { plan: "pro" } });
  }
  console.log(`Seeded ${people.length} users, ${docs.length} tuitions, ${apps.length} applications, ${pro.length} payments.`);
  console.log(`Password for every demo account: ${PASSWORD}`);
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
