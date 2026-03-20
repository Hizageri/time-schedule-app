const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/syllabus.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const targetCourses = ["MA01 線形代数 I", "MA02 線形代数 II", "MA03 微積分 I", "MA04 微積分 II", "NS01 力学"];

let modifiedCount = 0;
for (const course of data) {
    if (targetCourses.includes(course.id_name)) {
        if (course.classes.length > 3) {
            course.classes = course.classes.slice(0, 3);
            modifiedCount++;
            console.log(`Modified ${course.id_name}: retained 3 classes`);
        }
    }
}

if (modifiedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Successfully modified ${modifiedCount} courses.`);
} else {
    console.log('No courses needed modification or already modified.');
}
