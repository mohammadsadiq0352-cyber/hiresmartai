import { matchResumeWithJD } from "./aiMatcher.js";

const sampleResume = `
John Doe
Email: john.doe@example.com
Phone: +1 123-456-7890
Summary: Expert Software Engineer with 5 years of experience in Machine Learning and Node.js.
Skills: JavaScript, React, Cloud Computing, Artificial Intelligence, Python.
`;

const sampleJD = `
Job Title: AI Engineer
Requirements:
- 3+ years of experience in Machine Learning and Cloud Computing.
- Strong knowledge of Node.js and JavaScript.
- Experience with Deep Learning is a plus.
`;

console.log("--- Testing NLP Extraction ---");
const result = matchResumeWithJD(sampleResume, sampleJD);

console.log("Contact Info:", JSON.stringify(result.contactInfo, null, 2));
console.log("Matched Skills:", result.matchedSkills);
console.log("Missing Skills:", result.missingSkills);
console.log("Match Score:", result.matchScore);
console.log("Classification:", result.classification);

if (result.matchedSkills.includes("Machine Learning") && result.matchedSkills.includes("Cloud Computing")) {
    console.log("✅ Multi-word skill extraction (N-grams) working!");
} else {
    console.log("❌ Multi-word skill extraction failed.");
}

if (result.contactInfo.email === "john.doe@example.com") {
    console.log("✅ Email extraction working!");
} else {
    console.log("❌ Email extraction failed.");
}

console.log("--- Test Complete ---");
