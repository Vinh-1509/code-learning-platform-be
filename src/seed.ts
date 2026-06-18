import connectDB from './config/mongodb';
import mongoose from 'mongoose';
import {
  Roadmap,
  Milestone,
  Lesson,
  Block,
  UserMilestoneProgress,
  UserLessonProgress,
} from './models/learning_system.model';
import { Exercise } from './models/exercise.model';
import { ExerciseTag } from './models/exercise_tag.model';
import { UserTagStats } from './models/user_tag_stats.model';
import { LanguageInfo } from './models/language_info.model';
import type { IBlock } from './interfaces/learning_system.interface';

const asBlockContent = (content: IBlock['content']) => content;

export const seed = async (disconnectAfter = true) => {
  try {
    if (
      mongoose.connection.readyState === mongoose.ConnectionStates.disconnected
    ) {
      await connectDB();
      console.log('✓ Connected to MongoDB');
    }

    console.log('\n📝 Clearing collections...');
    await Promise.all([
      Roadmap.deleteMany({}),
      Milestone.deleteMany({}),
      Lesson.deleteMany({}),
      Block.deleteMany({}),
      UserLessonProgress.deleteMany({}),
      UserMilestoneProgress.deleteMany({}),
      Exercise.deleteMany({}),
      ExerciseTag.deleteMany({}),
      UserTagStats.deleteMany({}),
      LanguageInfo.deleteMany({}),
    ]);
    console.log('✓ Collections cleared');

    // ─── Language Info ───────────────────────────────────────────────────────

    console.log('\n🌐 Creating language_info...');
    await LanguageInfo.insertMany([
      {
        language: 'C++',
        info: 'C++ is a general-purpose programming language supporting procedural, object-oriented, and generic programming. Widely used for systems programming and competitive programming.',
        strengths: ['Performance', 'Memory Control', 'Hardware Access'],
        challenges: ['Manual Memory', 'Complex Syntax'],
        useCases: ['Game Engines', 'Operating Systems', 'Embedded Systems'],
      },
      {
        language: 'Java',
        info: 'Java is a high-level, class-based, object-oriented language designed to have as few implementation dependencies as possible. Runs on the JVM and is widely used in enterprise applications.',
        strengths: ['Clean OOP', 'Rich Ecosystem', 'Platform Independent'],
        challenges: ['Verbose Code', 'Memory Heavy'],
        useCases: [
          'Android Development',
          'Enterprise Backend',
          'Big Data Systems',
        ],
      },
    ]);
    console.log('✓ language_info created: C++, Java');

    // ─── Roadmaps ────────────────────────────────────────────────────────────

    console.log('\n📚 Creating Roadmaps...');
    console.log('\n🏷️ Creating exercise tags...');
    const tags = await ExerciseTag.insertMany([
      {
        name: 'Variables',
        description: 'Variable declaration, naming, assignment, and usage',
      },
      {
        name: 'Data Types',
        description: 'Choosing and matching data types and values',
      },
      {
        name: 'Input Output',
        description: 'Printing values and formatting program output',
      },
      {
        name: 'Type Conversion',
        description: 'Casting, narrowing, widening, and type conversion',
      },
      {
        name: 'Operators',
        description: 'Arithmetic, comparison, logical, and ternary operators',
      },
      {
        name: 'Control Flow',
        description: 'Conditional branching with if/else and switch',
      },
      {
        name: 'Loops',
        description: 'Repeated execution and loop control',
      },
      {
        name: 'OOP',
        description:
          'Classes, objects, constructors, encapsulation, inheritance, interfaces, abstraction, and polymorphism',
      },
    ]);
    const tagMap = new Map(tags.map((tag) => [tag.name, tag._id]));
    const tagIds = (...names: string[]) =>
      names.map((name) => {
        const tagId = tagMap.get(name);
        if (!tagId) {
          throw new Error(`Missing exercise tag: ${name}`);
        }
        return tagId;
      });
    console.log(`✓ exercise_tag created: ${tags.length} tags`);

    const roadmap = await Roadmap.create({
      language: 'C++',
      title: 'Lộ trình C++',
      description:
        'Một lộ trình toàn diện để học lập trình C++ từ cơ bản đến nâng cao',
    });

    const roadmapJava = await Roadmap.create({
      language: 'Java',
      title: 'Lộ trình Java',
      description:
        'Một lộ trình toàn diện để học lập trình Java từ cơ bản đến nâng cao',
    });
    console.log(
      `✓ Roadmaps created: C++ ${String(roadmap._id)}, Java ${String(roadmapJava._id)}`,
    );

    // ─── Milestones ──────────────────────────────────────────────────────────

    console.log('\n🎯 Creating Milestones...');
    const milestone1 = await Milestone.create({
      roadmapId: roadmap._id,
      title: 'C++ Fundamentals',
      order: 1,
      description:
        'Học các khái niệm cơ bản của C++: biến, kiểu dữ liệu, toán tử, và điều khiển luồng',
    });

    const milestone2 = await Milestone.create({
      roadmapId: roadmap._id,
      title: 'Object Oriented Programming',
      order: 2,
      description:
        'Hiểu và áp dụng các nguyên tắc OOP: class, inheritance, polymorphism, encapsulation',
    });
    console.log(
      `✓ Milestones created: ${String(milestone1._id)}, ${String(milestone2._id)}`,
    );

    // ─── Lessons ─────────────────────────────────────────────────────────────

    console.log('\n📖 Creating Lessons...');

    const lesson1_1 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Variables and Data Types',
      order: 1,
      blocks: [],
    });

    const lesson1_2 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Control Flow and Loops',
      order: 2,
      blocks: [],
    });

    const lesson2_1 = await Lesson.create({
      milestoneId: milestone2._id,
      title: 'Classes and Objects',
      order: 1,
      blocks: [],
    });

    const lesson2_2 = await Lesson.create({
      milestoneId: milestone2._id,
      title: 'Inheritance and Polymorphism',
      order: 2,
      blocks: [],
    });

    console.log('✓ Lessons created: 4 lessons');

    // ─── C++ Exercises ───────────────────────────────────────────────────────

    console.log('\n💪 Creating C++ Exercises...');

    // Lesson 1.1 Block 1 — fill_blank
    const exercise1 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Variables', 'Data Types'),
      title: 'Declare Student Variables',
      instruction:
        'Khai báo các biến để lưu thông tin của một sinh viên: tên (string), tuổi (int), và điểm (double)',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: ['', ' name = "John";\nint ', ' = 20;\ndouble ', ' = 95.5;'],
        placeholders: {
          input_1: 'string',
          input_2: 'age',
          input_3: 'score',
        },
      },
      correctAnswer: {
        input_1: 'string',
        input_2: 'age',
        input_3: 'score',
      },
      explanation:
        'Để lưu trữ tên ta sử dụng kiểu string, tuổi là int, và điểm là double. Cú pháp khai báo là: kiểu_dữ_liệu tên_biến = giá_trị;',
      hints: {
        '1': 'Tên của người dùng nên là một chuỗi ký tự, sử dụng từ khóa gì để khai báo?',
        '2': 'Tuổi là một số nguyên, sử dụng int',
        '3': 'Điểm có thể có phần thập phân, sử dụng double',
      },
      order: 1,
    });

    // Lesson 1.1 Block 1 — fill_blank
    const exercise2 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Input Output', 'Variables'),
      title: 'Output Variable Values',
      instruction: 'Viết mã để in ra giá trị của các biến: name, age, và score',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'cout << "Name: " << name << ',
          '\n',
          ' << age << ',
          '\n',
          ' << score << endl;',
        ],
        placeholders: {
          input_1: 'endl;',
          input_2: 'cout << "Age: "',
          input_3: 'endl;',
          input_4: 'cout << "Score: "',
        },
      },
      correctAnswer: {
        input_1: 'endl;',
        input_2: 'cout << "Age: "',
        input_3: 'endl;',
        input_4: 'cout << "Score: "',
      },
      explanation:
        'Sử dụng cout để in ra các biến. Mỗi dòng thông tin nên kết thúc bằng endl hoặc "\\n" để xuống dòng.',
      hints: {
        '1': 'Cần xuống dòng và in "Age: " trước khi in giá trị age',
        '2': 'Tương tự, cần xuống dòng và in "Score: " trước khi in giá trị score',
      },
      order: 2,
    });

    // Lesson 1.1 Block 2 — drag_drop
    const exercise3 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Data Types'),
      title: 'Match Data Types to Variables',
      instruction:
        'Kéo thả các giá trị phù hợp vào từng biến: int nhận số nguyên, double nhận số thực, char nhận ký tự, bool nhận giá trị logic',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 4,
        blocks: [
          { id: 'block-0', code: '42', indent: 0 },
          { id: 'block-1', code: '3.14159', indent: 0 },
          { id: 'block-2', code: "'A'", indent: 0 },
          { id: 'block-3', code: 'true', indent: 0 },
          { id: 'block-4', code: '100', indent: 0 },
          { id: 'block-5', code: '2.5', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
        '3': 'block-2',
        '4': 'block-3',
      },
      explanation:
        "int chứa số nguyên (42), double chứa số thực (3.14159), char chứa ký tự đơn trong ngoặc đơn ('A'), bool chứa giá trị true/false.",
      hints: {
        '1': 'Chọn số nguyên cho int',
        '2': 'Chọn số có phần thập phân cho double',
        '3': 'Ký tự phải được bao bởi dấu nháy đơn',
        '4': 'bool chỉ có hai giá trị: true hoặc false',
      },
      order: 1,
    });

    // Lesson 1.1 Block 3 — fill_blank
    const exercise4 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Type Conversion', 'Data Types'),
      title: 'Identify Casting Types',
      instruction:
        'Điền từ khóa phù hợp: implicit (ngầm định) hoặc explicit (tường minh)',
      language: 'C++',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: [
          'int a = 5;\ndouble b = a; // ',
          ' casting: int → double\n\ndouble d = 9.99;\nint x = (int) d; // ',
          ' casting: double → int',
        ],
        placeholders: {
          input_1: 'implicit',
          input_2: 'explicit',
        },
      },
      correctAnswer: {
        input_1: 'implicit',
        input_2: 'explicit',
      },
      explanation:
        'Chuyển đổi int → double tự động (không mất dữ liệu) nên gọi là ngầm định. Chuyển đổi double → int cần ép kiểu tường minh vì có nguy cơ mất phần thập phân.',
      hints: {
        '1': 'Casting không cần ký tự đặc biệt được gọi là gì?',
        '2': 'Casting cần dùng (type) được gọi là gì?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 1 — drag_drop
    const exercise5 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Operators', 'Control Flow'),
      title: 'Even or Odd Condition',
      instruction: 'Kéo thả toán tử đúng để kiểm tra xem số có chẵn không',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'i % 2 == 0', indent: 0 },
          { id: 'block-1', code: 'i == 2', indent: 0 },
          { id: 'block-2', code: 'i % 2 != 0', indent: 0 },
          { id: 'block-3', code: 'i / 2 == 0', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'Toán tử modulo (%) trả về phần dư. Nếu phần dư bằng 0, số là chẵn. Ví dụ: 4 % 2 = 0 (chẵn), 5 % 2 = 1 (lẻ).',
      hints: {
        '1': 'Toán tử nào tính phần dư của phép chia?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 2 — fill_blank
    const exercise6 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Control Flow'),
      title: 'Complete Switch Statement',
      instruction: 'Chọn các từ khóa đúng để hoàn thành câu lệnh switch',
      language: 'C++',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: [
          'switch (day) {\n  ',
          ' 1:\n    cout << "Monday";\n    ',
          ';\n  case 2:\n    cout << "Tuesday";\n    ',
          ';\n}',
        ],
        placeholders: {
          input_1: 'case',
          input_2: 'break',
          input_3: 'break',
        },
      },
      correctAnswer: {
        input_1: 'case',
        input_2: 'break',
        input_3: 'break',
      },
      explanation:
        'case kiểm tra giá trị. break thoát khỏi switch để tránh fall-through (chạy tiếp code phía dưới).',
      hints: {
        '1': 'Từ khóa để bắt đầu một nhánh là gì?',
        '2': 'Từ khóa để thoát khỏi switch là gì?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 3 — drag_drop
    const exercise7 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Loops'),
      title: 'While Loop Syntax',
      instruction:
        'Vòng lặp vô hạn nào kiểm tra điều kiện trước khi thực thi khối lệnh?',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'while', indent: 0 },
          { id: 'block-1', code: 'for', indent: 0 },
          { id: 'block-2', code: 'do-while', indent: 0 },
          { id: 'block-3', code: 'if', indent: 0 },
          { id: 'block-4', code: 'switch', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'while lặp lại khi điều kiện còn đúng. do-while cũng lặp nhưng kiểm tra điều kiện sau. for dùng khi biết số lần lặp.',
      hints: {
        '1': 'Kiểm tra điều kiện trước khi thực thi được gọi là từ khóa nào?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 1 — drag_drop
    const exercise8 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Access Modifiers',
      instruction:
        'Hãy điền access modifier phù hợp: __ cho thuộc tính ẩn, __ cho phương thức công khai',
      language: 'C++',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'public', indent: 0 },
          { id: 'block-1', code: 'private', indent: 0 },
          { id: 'block-2', code: 'protected', indent: 0 },
          { id: 'block-3', code: 'friend', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-1',
        '2': 'block-0',
      },
      explanation:
        'private giới hạn truy cập chỉ trong class. public cho phép truy cập từ mọi nơi. protected cho phép class con truy cập.',
      hints: {
        '1': 'Dữ liệu thường được ẩn bằng access modifier nào?',
        '2': 'Phương thức công khai dùng access modifier nào?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 2 — fill_blank
    const exercise9 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Constructor Syntax',
      instruction: 'Điền tên của constructor (phải trùng với tên class)',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'class Car {\npublic:\n  ',
          '(string model) { this->model = model; }\nprivate:\n  string model;\n};',
        ],
        placeholders: {
          input_1: 'Car',
        },
      },
      correctAnswer: {
        input_1: 'Car',
      },
      explanation:
        'Constructor phải có tên giống hệt tên class. Nó được gọi tự động khi tạo object để khởi tạo trạng thái ban đầu.',
      hints: {
        '1': 'Constructor phải có tên trùng với tên class nào?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 3 — drag_drop
    const exercise10 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Getter and Setter Methods',
      instruction:
        'Kéo thả lần lượt các tên phù hợp cho phương thức getter và tiền tố setter phù hợp',
      language: 'C++',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'getBalance', indent: 0 },
          { id: 'block-1', code: 'setBalance', indent: 0 },
          { id: 'block-2', code: 'readBalance', indent: 0 },
          { id: 'block-3', code: 'writeBalance', indent: 0 },
          { id: 'block-4', code: 'set', indent: 0 },
          { id: 'block-5', code: 'get', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-4',
      },
      explanation:
        'Getter bắt đầu với "get" để lấy giá trị thuộc tính. Setter bắt đầu với "set" để gán giá trị với kiểm tra hợp lệ.',
      hints: {
        '1': 'Phương thức lấy giá trị thường bắt đầu bằng từ gì?',
        '2': 'Phương thức gán giá trị thường bắt đầu bằng từ gì?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 1 — fill_blank
    const exercise11 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Inheritance Syntax',
      instruction: 'Điền từ khóa kế thừa để Dog kế thừa từ Animal',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'class Dog ',
          ' Animal {\npublic:\n  void bark() { cout << "Woof!"; }\n};',
        ],
        placeholders: {
          input_1: ': public',
        },
      },
      correctAnswer: {
        input_1: ': public',
      },
      explanation:
        'Dùng ": public" để kế thừa từ class cha. ": public" cho phép các public members của cha được thừa kế.',
      hints: {
        '1': 'Ký tự và từ khóa để kế thừa là gì?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 2 — drag_drop
    const exercise12 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Virtual Function Override',
      instruction:
        'Từ khóa __ cho phép compiler kiểm tra phương thức virtual từ class cha',
      language: 'C++',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'override', indent: 0 },
          { id: 'block-1', code: 'virtual', indent: 0 },
          { id: 'block-2', code: 'public', indent: 0 },
          { id: 'block-3', code: 'const', indent: 0 },
          { id: 'block-4', code: 'final', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'override cho phép compiler kiểm tra xem có phương thức virtual tương ứng trong class cha hay không. Giúp tránh lỗi typo.',
      hints: {
        '1': 'Từ khóa để ghi đè phương thức virtual là gì?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 3 — fill_blank
    const exercise13 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Pure Virtual Function',
      instruction:
        'Điền ký tự để tạo pure virtual function (class trở thành abstract)',
      language: 'C++',
      type: 'fill_blank',
      level: 'hard',
      data: {
        template: [
          'class Shape {\npublic:\n  virtual double area() const ',
          ' { }\n};',
        ],
        placeholders: {
          input_1: '= 0',
        },
      },
      correctAnswer: {
        input_1: '= 0',
      },
      explanation:
        'Pure virtual function được khai báo bằng "= 0". Class chứa pure virtual function không thể được khởi tạo (abstract).',
      hints: {
        '1': 'Ký tự để tạo pure virtual function là gì?',
      },
      order: 1,
    });

    console.log('✓ C++ Exercises created: 13 exercises');

    // ─── C++ Blocks ──────────────────────────────────────────────────────────

    console.log('\n🧩 Creating C++ Blocks...');

    const block1_1 = await Block.create({
      lessonId: lesson1_1._id,
      title: 'What is a Variable?',
      description: 'Data storage and types',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Variables là những vùng bộ nhớ dùng để lưu trữ dữ liệu. Mỗi biến có một tên (identifier) và kiểu dữ liệu (data type). C++ là ngôn ngữ kiểu tĩnh, nghĩa là bạn phải khai báo kiểu dữ liệu trước khi sử dụng biến.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  int age = 25;
  double height = 1.75;
  string name = "John";
  cout << "Name: " << name << endl;
  cout << "Age: " << age << endl;
  cout << "Height: " << height << endl;
  return 0;
}`,
            explanation:
              'Ví dụ này tạo ra ba biến: age (số nguyên), height (số thập phân), và name (chuỗi ký tự). Chúng được sử dụng để lưu trữ thông tin cá nhân.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise1._id, required: true },
        },
        {
          type: 'practice',
          data: { order: 4, exerciseId: exercise2._id, required: true },
        },
      ]),
      feynmanQuestion: 'Giải thích biến trong C++ bằng những từ của chính bạn',
      feynmanPrompt:
        'Hãy kiểm tra xem người dùng có thực sự hiểu khái niệm biến không',
    });

    const block1_1b = await Block.create({
      lessonId: lesson1_1._id,
      title: 'Primitive Data Types',
      description: 'Numeric, character, and boolean types in C++',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'C++ có các kiểu dữ liệu nguyên thủy (primitive types) được chia thành 4 nhóm: kiểu số nguyên (int, short, long, long long), kiểu số thực (float, double, long double), kiểu ký tự (char), và kiểu logic (bool). Mỗi kiểu có kích thước bộ nhớ và phạm vi giá trị khác nhau.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
#include <climits>
using namespace std;

int main() {
  int i = 2147483647;
  long long ll = 9223372036854775807LL;
  double d = 3.14159265358979;
  char c = 'A';
  bool flag = true;

  cout << "int max : " << i   << endl;
  cout << "long long: " << ll  << endl;
  cout << "double  : " << d   << endl;
  cout << "char    : " << c   << endl;
  cout << "bool    : " << flag << endl;
  return 0;
}`,
            explanation:
              'Minh họa các kiểu dữ liệu cơ bản. int lưu số nguyên 32-bit, long long cho số nguyên 64-bit, double cho số thực với độ chính xác cao, char cho ký tự đơn, bool cho giá trị đúng/sai.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise3._id, required: true },
        },
      ]),
      feynmanQuestion: 'Khi nào bạn chọn int thay vì double?',
      feynmanPrompt:
        'Kiểm tra xem người dùng hiểu sự khác biệt giữa các kiểu số nguyên và số thực',
    });

    const block1_1c = await Block.create({
      lessonId: lesson1_1._id,
      title: 'Type Casting and Constants',
      description: 'Converting between types and defining constants',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Type casting cho phép chuyển đổi giá trị từ kiểu này sang kiểu khác. Implicit casting (ngầm định) xảy ra tự động khi không có mất dữ liệu (int → double). Explicit casting (tường minh) dùng static_cast<> khi có nguy cơ mất dữ liệu (double → int). Hằng số (constants) được khai báo bằng từ khóa const và không thể thay đổi sau khi gán.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  const double PI = 3.14159;
  int radius = 5;

  double area = PI * radius * radius;
  int approxArea = static_cast<int>(area);

  cout << "Exact area  : " << area      << endl;
  cout << "Approx area : " << approxArea << endl;
  return 0;
}`,
            explanation:
              'PI là hằng số không thể thay đổi. Khi nhân int với double, int được tự động chuyển sang double (implicit cast). static_cast<int> chuyển ngược lại và cắt bỏ phần thập phân.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise4._id, required: true },
        },
      ]),
      feynmanQuestion: 'Tại sao explicit casting đôi khi gây mất dữ liệu?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích điều gì xảy ra với phần thập phân khi ép kiểu từ double sang int',
    });

    const block1_2 = await Block.create({
      lessonId: lesson1_2._id,
      title: 'Control Flow Basics',
      description: 'If-else, loops, and conditionals',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Điều khiển luồng (Control Flow) cho phép bạn quyết định những phần mã nào sẽ được thực thi. Có ba loại chính: if-else để rẽ nhánh, switch-case cho nhiều trường hợp, và vòng lặp (for, while) để lặp lại.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) {
      cout << i << " is even" << endl;
    } else {
      cout << i << " is odd" << endl;
    }
  }
  return 0;
}`,
            explanation:
              'Vòng lặp for lặp từ 1 đến 10. Mỗi lần lặp, kiểm tra xem số có chẵn (chia hết cho 2) hay lẻ bằng toán tử modulo (%).',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise5._id, required: true },
        },
      ]),
      feynmanQuestion: 'Tại sao chúng ta cần các câu lệnh điều khiển luồng?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có hiểu lợi ích của việc sử dụng if-else và vòng lặp không',
    });

    const block1_2b = await Block.create({
      lessonId: lesson1_2._id,
      title: 'Switch-Case and Nested Conditions',
      description: 'Multi-branch selection with switch-case',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'switch-case là lựa chọn thay thế cho chuỗi if-else khi so sánh một biến với nhiều giá trị cố định. Mỗi case cần có break để tránh fall-through. default xử lý tất cả các trường hợp còn lại.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  int day = 3;
  switch (day) {
    case 1: cout << "Monday"    << endl; break;
    case 2: cout << "Tuesday"   << endl; break;
    case 3: cout << "Wednesday" << endl; break;
    case 4: cout << "Thursday"  << endl; break;
    case 5: cout << "Friday"    << endl; break;
    default: cout << "Weekend"  << endl; break;
  }
  return 0;
}`,
            explanation:
              'switch kiểm tra giá trị của day và nhảy thẳng đến case tương ứng. break ngăn code chạy tiếp sang case kế. default bắt các giá trị nằm ngoài 1-5.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise6._id, required: true },
        },
      ]),
      feynmanQuestion: 'Khi nào nên dùng switch thay vì if-else?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có biết khi nào switch rõ ràng hơn và khi nào if-else linh hoạt hơn',
    });

    const block1_2c = await Block.create({
      lessonId: lesson1_2._id,
      title: 'While and Do-While Loops',
      description: 'Condition-driven repetition in C++',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'while lặp lại khi điều kiện còn đúng, kiểm tra trước khi thực thi. do-while luôn thực thi ít nhất một lần vì kiểm tra điều kiện sau mỗi vòng. break thoát vòng lặp ngay lập tức, continue bỏ qua phần còn lại của vòng lặp hiện tại.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  int sum = 0, n = 1;
  while (sum <= 50) {
    sum += n++;
  }
  cout << "First sum > 50: " << sum << " (n=" << n-1 << ")" << endl;

  int x = 100;
  do {
    cout << "do-while ran with x=" << x << endl;
  } while (x < 10);

  return 0;
}`,
            explanation:
              'Vòng while cộng dồn đến khi sum vượt 50. Vòng do-while chạy một lần dù x=100 không thỏa điều kiện x<10.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise7._id, required: true },
        },
      ]),
      feynmanQuestion: 'Sự khác nhau giữa while và do-while là gì?',
      feynmanPrompt:
        'Yêu cầu người dùng mô tả tình huống thực tế mà do-while phù hợp hơn while',
    });

    const block2_1 = await Block.create({
      lessonId: lesson2_1._id,
      title: 'Introduction to Classes',
      description: 'Class definitions and object creation',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Một class là một khuôn mẫu (template) để tạo ra các objects. Nó chứa các thuộc tính (attributes) mô tả trạng thái và phương thức (methods) mô tả hành vi. Object là một instance cụ thể được tạo ra từ class đó.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Student {
private:
  string name;
  int age;
public:
  Student(string n, int a) : name(n), age(a) {}

  void display() {
    cout << "Name: " << name << ", Age: " << age << endl;
  }
};

int main() {
  Student s1("Alice", 20);
  s1.display();
  return 0;
}`,
            explanation:
              'Đây là một class Student với thuộc tính private (name, age) và phương thức public (display). Constructor khởi tạo các giá trị khi tạo object.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise8._id, required: true },
        },
      ]),
      feynmanQuestion: 'Class là gì và nó khác gì với object?',
      feynmanPrompt:
        'Kiểm tra sự hiểu biết về sự khác biệt giữa class definition và instance',
    });

    const block2_1b = await Block.create({
      lessonId: lesson2_1._id,
      title: 'Constructors and Destructors',
      description: 'Object lifecycle management in C++',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Constructor là phương thức đặc biệt được gọi tự động khi object được tạo ra. Có thể có nhiều constructor với các tham số khác nhau (constructor overloading). Destructor (~ClassName) được gọi khi object bị hủy, thường dùng để giải phóng bộ nhớ.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Box {
public:
  double width, height;

  Box() : width(1), height(1) {
    cout << "Default box created" << endl;
  }
  Box(double w, double h) : width(w), height(h) {
    cout << "Box created: " << w << "x" << h << endl;
  }
  ~Box() {
    cout << "Box destroyed" << endl;
  }
  double area() { return width * height; }
};

int main() {
  Box b1;
  Box b2(4.0, 3.0);
  cout << "b1 area: " << b1.area() << endl;
  cout << "b2 area: " << b2.area() << endl;
  return 0;
}`,
            explanation:
              'Box có hai constructor: mặc định (1x1) và có tham số. Destructor in thông báo khi object bị hủy. Thứ tự hủy ngược với thứ tự tạo: b2 bị hủy trước b1.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise9._id, required: true },
        },
      ]),
      feynmanQuestion: 'Khi nào destructor được gọi?',
      feynmanPrompt:
        'Kiểm tra hiểu biết về vòng đời object và tại sao destructor quan trọng khi dùng bộ nhớ động',
    });

    const block2_1c = await Block.create({
      lessonId: lesson2_1._id,
      title: 'Access Modifiers and Encapsulation',
      description: 'Controlling data access with public, private, protected',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Encapsulation (đóng gói) là việc ẩn dữ liệu bên trong class và chỉ cho phép truy cập qua các phương thức công khai. C++ có ba access modifier: public (truy cập từ mọi nơi), private (chỉ trong class), và protected (trong class và class con). Getter/setter là các phương thức dùng để đọc/ghi dữ liệu private.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class BankAccount {
private:
  double balance;

public:
  BankAccount(double initial) : balance(initial) {}

  void deposit(double amount) {
    if (amount > 0) balance += amount;
  }

  bool withdraw(double amount) {
    if (amount > 0 && balance >= amount) {
      balance -= amount;
      return true;
    }
    return false;
  }

  double getBalance() const { return balance; }
};

int main() {
  BankAccount acc(1000.0);
  acc.deposit(500.0);
  acc.withdraw(200.0);
  cout << "Balance: " << acc.getBalance() << endl;
  return 0;
}`,
            explanation:
              'balance là private — không ai có thể gán trực tiếp acc.balance = -9999. Chỉ deposit/withdraw mới thay đổi được số dư, và chúng kiểm tra tính hợp lệ trước khi cập nhật.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise10._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Tại sao chúng ta nên dùng private thay vì public cho dữ liệu?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích lợi ích của encapsulation bằng ví dụ thực tế',
    });

    const block2_2 = await Block.create({
      lessonId: lesson2_2._id,
      title: 'Inheritance and Polymorphism',
      description: 'Class inheritance and virtual methods',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Inheritance cho phép một class kế thừa các thuộc tính và phương thức từ class khác, giúp tái sử dụng code. Polymorphism cho phép các object của các class khác nhau phản ứng theo những cách khác nhau với cùng một lời gọi phương thức, thông qua virtual functions.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Animal {
public:
  virtual void sound() {
    cout << "Some sound" << endl;
  }
};

class Dog : public Animal {
public:
  void sound() override {
    cout << "Woof!" << endl;
  }
};

class Cat : public Animal {
public:
  void sound() override {
    cout << "Meow!" << endl;
  }
};

int main() {
  Dog dog;
  Cat cat;
  dog.sound();
  cat.sound();
  return 0;
}`,
            explanation:
              'Dog và Cat kế thừa từ Animal. Mỗi class ghi đè (override) phương thức sound() để phát ra âm thanh khác nhau. Đây là ví dụ của polymorphism qua virtual functions.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise11._id, required: true },
        },
      ]),
      feynmanQuestion: 'Tại sao chúng ta sử dụng virtual functions ở đây?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích lợi ích của polymorphism và cho ví dụ thực tế',
    });

    const block2_2b = await Block.create({
      lessonId: lesson2_2._id,
      title: 'Abstract Classes and Pure Virtual Functions',
      description: 'Defining interfaces through abstract base classes',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Abstract class là class không thể tạo object trực tiếp. Nó chứa ít nhất một pure virtual function (khai báo với = 0). Mọi class con đều phải override tất cả pure virtual functions để có thể được khởi tạo.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Shape {
public:
  virtual double area() const = 0;
  virtual void describe() const {
    cout << "Area: " << area() << endl;
  }
};

class Circle : public Shape {
  double r;
public:
  Circle(double r) : r(r) {}
  double area() const override { return 3.14159 * r * r; }
};

class Rectangle : public Shape {
  double w, h;
public:
  Rectangle(double w, double h) : w(w), h(h) {}
  double area() const override { return w * h; }
};

int main() {
  Circle c(5);
  Rectangle rect(4, 6);
  c.describe();
  rect.describe();
  return 0;
}`,
            explanation:
              'Shape không thể được khởi tạo vì area() là pure virtual. Circle và Rectangle đều bắt buộc phải cài đặt area(). describe() được thừa kế và dùng được ngay mà không cần override.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise12._id, required: true },
        },
      ]),
      feynmanQuestion: 'Tại sao không thể tạo object từ abstract class?',
      feynmanPrompt:
        'Kiểm tra xem người dùng hiểu tại sao abstract class tồn tại và khác gì so với class thông thường',
    });

    const block2_2c = await Block.create({
      lessonId: lesson2_2._id,
      title: 'Operator Overloading',
      description: 'Redefining operators for custom types',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'C++ cho phép định nghĩa lại hành vi của các toán tử (+, -, *, ==, <<, v.v.) cho class tự tạo. Điều này giúp code trở nên trực quan hơn. Operator overloading là một dạng polymorphism tĩnh (static polymorphism).',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Vector2D {
public:
  double x, y;
  Vector2D(double x, double y) : x(x), y(y) {}

  Vector2D operator+(const Vector2D& other) const {
    return Vector2D(x + other.x, y + other.y);
  }

  bool operator==(const Vector2D& other) const {
    return x == other.x && y == other.y;
  }

  friend ostream& operator<<(ostream& os, const Vector2D& v) {
    return os << "(" << v.x << ", " << v.y << ")";
  }
};

int main() {
  Vector2D a(1, 2), b(3, 4);
  Vector2D c = a + b;
  cout << a << " + " << b << " = " << c << endl;
  cout << "Equal? " << (a == b ? "yes" : "no") << endl;
  return 0;
}`,
            explanation:
              'operator+ trả về Vector2D mới bằng cách cộng từng thành phần. operator<< được khai báo là friend để truy cập private members và cho phép dùng cout << v trực tiếp.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise13._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Lợi ích của operator overloading so với việc dùng hàm thông thường là gì?',
      feynmanPrompt:
        'Yêu cầu người dùng so sánh v1 + v2 với add(v1, v2) về mặt tính dễ đọc và sử dụng',
    });

    console.log('✓ C++ Blocks created: 12 blocks');

    // ─── Link C++ blocks to lessons ──────────────────────────────────────────

    console.log('\n🔗 Linking blocks to C++ lessons...');
    lesson1_1.blocks = [block1_1._id, block1_1b._id, block1_1c._id];
    lesson1_2.blocks = [block1_2._id, block1_2b._id, block1_2c._id];
    lesson2_1.blocks = [block2_1._id, block2_1b._id, block2_1c._id];
    lesson2_2.blocks = [block2_2._id, block2_2b._id, block2_2c._id];

    await Promise.all([
      lesson1_1.save(),
      lesson1_2.save(),
      lesson2_1.save(),
      lesson2_2.save(),
    ]);
    console.log('✓ Blocks linked to C++ lessons');

    // ─── Java Roadmap ────────────────────────────────────────────────────────

    console.log('\n☕ Creating Java learning path...');

    const javaMilestone1 = await Milestone.create({
      roadmapId: roadmapJava._id,
      title: 'Java Fundamentals',
      order: 1,
      description: 'Variables, types, control flow, and methods in Java',
    });

    const javaMilestone2 = await Milestone.create({
      roadmapId: roadmapJava._id,
      title: 'Object Oriented Java',
      order: 2,
      description: 'Classes, inheritance, interfaces, and polymorphism in Java',
    });

    const javaLesson1_1 = await Lesson.create({
      milestoneId: javaMilestone1._id,
      title: 'Variables and Types',
      order: 1,
      blocks: [],
    });
    const javaLesson1_2 = await Lesson.create({
      milestoneId: javaMilestone1._id,
      title: 'Control Flow',
      order: 2,
      blocks: [],
    });
    const javaLesson2_1 = await Lesson.create({
      milestoneId: javaMilestone2._id,
      title: 'Classes and Objects',
      order: 1,
      blocks: [],
    });
    const javaLesson2_2 = await Lesson.create({
      milestoneId: javaMilestone2._id,
      title: 'Inheritance and Interfaces',
      order: 2,
      blocks: [],
    });

    // ─── Java Exercises ──────────────────────────────────────────────────────

    console.log('\n💪 Creating Java Exercises...');

    // Java Lesson 1.1 Block 1 — fill_blank
    const javaExercise1 = await Exercise.create({
      lessonId: javaLesson1_1._id,
      tagId: tagIds('Variables', 'Data Types'),
      title: 'Declare Java Variables',
      instruction:
        'Declare variables for person data: name (String), age (int), height (double)',
      language: 'Java',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'String name = "Alice";\nint ',
          ' = 25;\n',
          ' height = 1.75;',
        ],
        placeholders: {
          input_1: 'age',
          input_2: 'double',
        },
      },
      correctAnswer: {
        input_1: 'age',
        input_2: 'double',
      },
      explanation:
        'Biến int lưu số nguyên tuổi, double lưu số thực chiều cao. String lưu tên (tuy đã cho sẵn ở đây).',
      hints: {
        '1': 'Từ khóa kiểu dữ liệu cho số nguyên',
        '2': 'Từ khóa kiểu dữ liệu cho số thực',
      },
      order: 1,
    });

    // Java Lesson 1.1 Block 2 — drag_drop
    const javaExercise2 = await Exercise.create({
      lessonId: javaLesson1_1._id,
      tagId: tagIds('Data Types'),
      title: 'Match Java Types',
      instruction:
        'Kéo thả giá trị phù hợp cho từng kiểu dữ liệu Java: int, String, double, boolean',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 4,
        blocks: [
          { id: 'block-0', code: '25', indent: 0 },
          { id: 'block-1', code: '"Bob"', indent: 0 },
          { id: 'block-2', code: '50000.50', indent: 0 },
          { id: 'block-3', code: 'true', indent: 0 },
          { id: 'block-4', code: 'false', indent: 0 },
          { id: 'block-5', code: 'abc', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
        '3': 'block-2',
        '4': 'block-3',
      },
      explanation:
        'int nhận số nguyên (25), String nhận text trong dấu ngoặc kép ("Bob"), double nhận thập phân (50000.50), boolean nhận true/false.',
      hints: {
        '1': 'int chứa số nguyên',
        '2': 'String chứa text',
        '3': 'double chứa số thực',
        '4': 'boolean chứa true/false',
      },
      order: 1,
    });

    // Java Lesson 1.1 Block 3 — fill_blank
    const javaExercise3 = await Exercise.create({
      lessonId: javaLesson1_1._id,
      tagId: tagIds('Type Conversion', 'Data Types'),
      title: 'Type Narrowing in Java',
      instruction:
        'Điền kiểu dữ liệu phù hợp khi chuyển đổi từ double sang int',
      language: 'Java',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: ['double d = 9.99;\n', ' i = (', ') d; // narrowing cast'],
        placeholders: {
          input_1: 'int',
          input_2: 'int',
        },
      },
      correctAnswer: {
        input_1: 'int',
        input_2: 'int',
      },
      explanation:
        'Chuyển đổi từ double sang int cần ép kiểu tường minh "(int)". Phần thập phân (.99) bị cắt bỏ.',
      hints: {
        '1': 'Kiểu của biến i',
        '2': 'Kiểu trong dấu ngoặc để ép kiểu',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 1 — drag_drop
    const javaExercise4 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Control Flow'),
      title: 'If-Else Structure',
      instruction: 'Kéo thả từ khóa để hoàn thành if-else statement',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'if', indent: 0 },
          { id: 'block-1', code: 'else', indent: 0 },
          { id: 'block-2', code: 'else if', indent: 0 },
          { id: 'block-3', code: 'while', indent: 0 },
          { id: 'block-4', code: 'for', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
      },
      explanation:
        'if kiểm tra điều kiện. else xử lý trường hợp còn lại. if không thỏa, code chạy vào else.',
      hints: {
        '1': 'Từ khóa để kiểm tra điều kiện',
        '2': 'Từ khóa cho nhánh khác',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 2 — fill_blank
    const javaExercise5 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Operators', 'Control Flow'),
      title: 'Ternary Operator',
      instruction: 'Điền các ký tự của ternary operator (condition ? yes : no)',
      language: 'Java',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: ['String result = (score >= 60) ', ' "Pass" ', ' "Fail";'],
        placeholders: {
          input_1: '?',
          input_2: ':',
        },
      },
      correctAnswer: {
        input_1: '?',
        input_2: ':',
      },
      explanation:
        'Ternary operator viết gọn if-else: condition ? valueIfTrue : valueIfFalse. Nếu condition đúng trả valueIfTrue, sai trả valueIfFalse.',
      hints: {
        '1': 'Ký tự phân tách điều kiện và giá trị đúng',
        '2': 'Ký tự phân tách giá trị đúng và sai',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 3 — drag_drop
    const javaExercise6 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Loops'),
      title: 'Loop Control Keywords',
      instruction:
        'Từ khóa __ dùng để thoát vòng lặp ngay, __ để bỏ qua lần lặp hiện tại.',
      language: 'Java',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'break', indent: 0 },
          { id: 'block-1', code: 'continue', indent: 0 },
          { id: 'block-2', code: 'return', indent: 0 },
          { id: 'block-3', code: 'exit', indent: 0 },
          { id: 'block-4', code: 'skip', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
      },
      explanation:
        'break thoát vòng lặp ngay (i=5 dừng). continue bỏ qua phần còn lại, nhảy sang lần lặp tiếp.',
      hints: {
        '1': 'Từ khóa để thoát khỏi vòng lặp ngay lập tức',
        '2': 'Từ khóa để bỏ qua lần lặp hiện tại',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 1 — fill_blank
    const javaExercise7 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Class Constructor',
      instruction: 'Điền tên của constructor (phải trùng với tên class)',
      language: 'Java',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'class Car {\n  ',
          ' (String model) {\n    this.model = model;\n  }\n}',
        ],
        placeholders: {
          input_1: 'Car',
        },
      },
      correctAnswer: {
        input_1: 'Car',
      },
      explanation:
        'Constructor phải có tên giống class. Được gọi tự động khi tạo object bằng new Car(...).',
      hints: {
        '1': 'Tên constructor phải giống tên class nào?',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 2 — drag_drop
    const javaExercise8 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Getter Method Pattern',
      instruction:
        'Kéo thả tên getter phù hợp nhất để lấy giá trị thuộc tính name',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'getName', indent: 0 },
          { id: 'block-1', code: 'getname', indent: 0 },
          { id: 'block-2', code: 'readName', indent: 0 },
          { id: 'block-3', code: 'fetchName', indent: 0 },
          { id: 'block-4', code: 'name', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'Getter theo naming convention bắt đầu với "get" viết hoa chữ cái đầu thuộc tính. getName lấy giá trị name.',
      hints: {
        '1': 'Getter nên bắt đầu bằng từ gì?',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 3 — fill_blank
    const javaExercise9 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Static Variable',
      instruction:
        'Điền từ khóa để khai báo biến chia sẻ cho tất cả instances của class',
      language: 'Java',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: ['public class Counter {\n  ', ' int count = 0;\n}'],
        placeholders: {
          input_1: 'static',
        },
      },
      correctAnswer: {
        input_1: 'static',
      },
      explanation:
        'static biến thuộc class, không thuộc object. Tất cả instances chia sẻ cùng một biến static. Truy cập qua ClassName.field.',
      hints: {
        '1': 'Từ khóa để khai báo biến chia sẻ',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 1 — drag_drop
    const javaExercise10 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Extends and Implements',
      instruction: 'Hãy điền từ khóa phù hợp. Dog __ Animal, Cat __ Speakable.',
      language: 'Java',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'extends', indent: 0 },
          { id: 'block-1', code: 'implements', indent: 0 },
          { id: 'block-2', code: 'inherits', indent: 0 },
          { id: 'block-3', code: 'uses', indent: 0 },
        ],
      },
      correctAnswer: { '1': 'block-0', '2': 'block-1' },
      explanation:
        'extends: kế thừa từ class cha. implements: triển khai interface. Dog là Dog (extends Animal), Cat phải implement Speakable.',
      hints: {
        '1': 'Từ khóa để kế thừa từ class',
        '2': 'Từ khóa để triển khai interface',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 2 — fill_blank
    const javaExercise11 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Abstract Method',
      instruction:
        'Điền từ khóa để khai báo phương thức abstract (không có body)',
      language: 'Java',
      type: 'fill_blank',
      level: 'hard',
      data: {
        template: ['abstract class Shape {\n  ', ' double area();\n}'],
        placeholders: {
          input_1: 'abstract',
        },
      },
      correctAnswer: {
        input_1: 'abstract',
      },
      explanation:
        'abstract method là phương thức không có cài đặt. Class con bắt buộc phải override nó. Class chứa abstract method phải là abstract class.',
      hints: {
        '1': 'Từ khóa để khai báo phương thức không có body',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 3 — drag_drop
    const javaExercise12 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Default Interface Method',
      instruction:
        'Kéo thả access modifier đúng khi khai báo default method trong interface',
      language: 'Java',
      type: 'drag_drop',
      level: 'hard',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'public', indent: 0 },
          { id: 'block-1', code: 'private', indent: 0 },
          { id: 'block-2', code: 'protected', indent: 0 },
          { id: 'block-3', code: 'static', indent: 0 },
          { id: 'block-4', code: 'final', indent: 0 },
        ],
      },
      correctAnswer: { '1': 'block-0' },
      explanation:
        'Interface method phải là public (interface là contract công khai). default method cho phép có cài đặt mà không buộc class con override.',
      hints: {
        '1': 'Interface method phải có access modifier nào?',
      },
      order: 1,
    });

    console.log('✓ Java Exercises created: 12 exercises');

    // ─── Java Blocks ─────────────────────────────────────────────────────────

    console.log('\n🧩 Creating Java Blocks...');

    const javaBlock1_1 = await Block.create({
      lessonId: javaLesson1_1._id,
      title: 'Java Variables and Types',
      description: 'Primitive and reference variables in Java',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'In Java, every variable must be declared with a type. Primitive types (int, double, boolean, char) hold values directly, while reference types (String, arrays, objects) hold a reference to memory. Java is statically typed, so type mismatches are caught at compile time.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    int age = 25;
    double height = 1.75;
    String name = "Alice";
    boolean isStudent = true;
    System.out.println(name + " is " + age + " years old.");
    System.out.println("Height: " + height);
    System.out.println("Is student: " + isStudent);
  }
}`,
            explanation:
              'Declares an int, double, String, and boolean, then prints each. Note that String is capitalised — it is a reference type, not a primitive.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise1._id, required: true },
        },
      ]),
      feynmanQuestion: 'Explain Java variable types in your own words',
      feynmanPrompt:
        'Check understanding of primitives vs reference types and why the distinction matters',
    });

    const javaBlock1_1b = await Block.create({
      lessonId: javaLesson1_1._id,
      title: 'Casting and Wrapper Types',
      description: 'Type conversion and primitive wrapper classes',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java supports widening (implicit) and narrowing (explicit) type casting between primitives. Widening is safe and automatic (int → long → double), while narrowing requires an explicit cast and may lose data (double → int). Wrapper classes (Integer, Double, Boolean, etc.) wrap primitives as objects, enabling use in collections and providing utility methods.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    int i = 42;
    double d = i;           // widening (implicit)
    int back = (int) 9.99;  // narrowing (explicit) → 9

    Integer wrapped = Integer.valueOf(i);
    int unwrapped = wrapped;
    String s = Integer.toString(i);

    System.out.println("double: " + d);
    System.out.println("narrowed: " + back);
    System.out.println("max int: " + Integer.MAX_VALUE);
    System.out.println("parsed: " + Integer.parseInt("123"));
  }
}`,
            explanation:
              'Widening from int to double is automatic. Narrowing with (int) truncates the decimal. Integer.MAX_VALUE and parseInt() are static utility methods available on the wrapper class.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise2._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why does narrowing require an explicit cast in Java?',
      feynmanPrompt:
        'Check whether the user understands potential data loss and why the compiler forces explicit acknowledgement',
    });

    const javaBlock1_1c = await Block.create({
      lessonId: javaLesson1_1._id,
      title: 'String Basics and StringBuilder',
      description: 'Immutable strings and efficient text building',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'In Java, String is an immutable reference type — once created its value cannot change. Key methods include length(), charAt(), substring(), toUpperCase(), toLowerCase(), contains(), replace(), split(), and trim(). StringBuilder is preferred for repeated modifications in loops due to better performance.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    String name = "  Alice Nguyen  ";
    String trimmed = name.trim();
    String upper = trimmed.toUpperCase();

    System.out.println("Length  : " + trimmed.length());
    System.out.println("Upper   : " + upper);
    System.out.println("Sub     : " + trimmed.substring(0, 5));
    System.out.println("Replace : " + trimmed.replace("Nguyen", "Smith"));
    System.out.println("Contains: " + trimmed.contains("Alice"));

    StringBuilder sb = new StringBuilder();
    for (int i = 1; i <= 5; i++) sb.append(i).append(" ");
    System.out.println("Built   : " + sb.toString().trim());
  }
}`,
            explanation:
              'trim() removes leading/trailing spaces. substring(0,5) extracts "Alice". StringBuilder avoids creating a new String object on every loop iteration.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise3._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Why should you use StringBuilder instead of + in a loop?',
      feynmanPrompt:
        'Verify understanding of String immutability and the performance cost of repeated concatenation',
    });

    const javaBlock1_2 = await Block.create({
      lessonId: javaLesson1_2._id,
      title: 'Java Control Flow Basics',
      description: 'If-else, loops, and iteration in Java',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java uses if-else for conditional branching, switch for multi-case selection, and for / while / do-while loops for repetition. The enhanced for-each loop is also available for iterating over arrays and collections.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    for (int i = 1; i <= 10; i++) {
      if (i % 2 == 0) {
        System.out.println(i + " is even");
      } else {
        System.out.println(i + " is odd");
      }
    }
  }
}`,
            explanation:
              'A for loop runs from 1 to 10. Each iteration uses the modulo operator to decide whether the number is even or odd.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise4._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why do we need control flow statements?',
      feynmanPrompt:
        'Verify understanding of branching and loops; ask for a real-world analogy',
    });

    const javaBlock1_2b = await Block.create({
      lessonId: javaLesson1_2._id,
      title: 'Switch Expressions and Ternary',
      description: 'Multi-branch selection and concise conditions',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java 14+ introduced switch expressions with arrow syntax (->), eliminating the need for break and allowing a switch to return a value directly. The ternary operator (condition ? a : b) provides a concise inline alternative to simple if-else.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    int month = 4;

    String season = switch (month) {
      case 12, 1, 2  -> "Winter";
      case 3,  4, 5  -> "Spring";
      case 6,  7, 8  -> "Summer";
      default        -> "Autumn";
    };
    System.out.println("Season: " + season);

    int score = 75;
    String grade = score >= 60 ? "Pass" : "Fail";
    System.out.println("Grade: " + grade);
  }
}`,
            explanation:
              'The switch expression directly assigns to season with no break needed. Multiple case labels can share one branch. The ternary evaluates score in one expression.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise5._id, required: true },
        },
      ]),
      feynmanQuestion:
        'What advantage does the switch expression have over the traditional switch statement?',
      feynmanPrompt:
        'Check understanding of arrow syntax, no fall-through, and the ability to return a value',
    });

    const javaBlock1_2c = await Block.create({
      lessonId: javaLesson1_2._id,
      title: 'Break, Continue, and Nested Loops',
      description: 'Loop control and labeled flow statements',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'break immediately exits the nearest enclosing loop or switch. continue skips the rest of the current iteration and moves to the next. Labeled break and continue let you target an outer loop in nested loops. The enhanced for-each loop (for (T item : collection)) simplifies iteration over arrays and collections.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    for (int i = 1; i <= 8; i++) {
      if (i % 2 == 0) continue;
      System.out.print(i + " ");
    }
    System.out.println();

    outer:
    for (int r = 0; r < 3; r++) {
      for (int c = 0; c < 3; c++) {
        if (r == 1 && c == 1) break outer;
        System.out.print("[" + r + "," + c + "] ");
      }
    }
    System.out.println("\nDone");

    int[] nums = {10, 20, 30};
    for (int n : nums) System.out.print(n + " ");
  }
}`,
            explanation:
              'continue skips even numbers. The labeled break outer exits both loops when row=1, col=1 is reached. for-each iterates the array cleanly without an index variable.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise6._id, required: true },
        },
      ]),
      feynmanQuestion:
        'When would you use a labeled break instead of a regular break?',
      feynmanPrompt:
        'Ask the user to describe a scenario where a labeled break is necessary and what would happen without the label',
    });

    const javaBlock2_1 = await Block.create({
      lessonId: javaLesson2_1._id,
      title: 'Classes and Objects',
      description: 'Fields, constructors, and object instances',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: "A Java class is a blueprint that defines fields (state) and methods (behaviour). An object is a specific instance of a class created with the new keyword. Constructors initialise the object's state when it is created.",
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `class Person {
  private String name;
  private int age;

  Person(String name, int age) {
    this.name = name;
    this.age = age;
  }

  void greet() {
    System.out.println("Hello, I'm " + name + " and I'm " + age);
  }
}

public class Main {
  public static void main(String[] args) {
    Person p = new Person("Alice", 20);
    p.greet();
  }
}`,
            explanation:
              'A Person class with private fields, a constructor using this to distinguish parameters from fields, and a public method. One object is instantiated and its method called.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise7._id, required: true },
        },
      ]),
      feynmanQuestion: 'What is the difference between a class and an object?',
      feynmanPrompt:
        'Check class vs instance understanding; ask for an everyday analogy',
    });

    const javaBlock2_1b = await Block.create({
      lessonId: javaLesson2_1._id,
      title: 'Getters, Setters, and Encapsulation',
      description: 'Controlled access and validation',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Encapsulation in Java means declaring fields private and exposing controlled access through public getter and setter methods. Getters return the field value; setters validate input before updating it. This protects the internal state from invalid or unexpected changes.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Student {
  private String name;
  private int age;

  public Student(String name, int age) {
    this.name = name;
    setAge(age);
  }

  public String getName() { return name; }
  public void   setName(String name) {
    if (name != null && !name.isBlank()) this.name = name;
  }

  public int  getAge() { return age; }
  public void setAge(int age) {
    if (age >= 0 && age <= 150) this.age = age;
  }

  @Override
  public String toString() {
    return name + " (age " + age + ")";
  }

  public static void main(String[] args) {
    Student s = new Student("Bob", 20);
    s.setAge(-5);
    System.out.println(s);
  }
}`,
            explanation:
              'setAge rejects the invalid value -5, so age stays 20. Calling the setter from the constructor ensures validation runs even at creation time.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise8._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Why call the setter inside the constructor instead of assigning the field directly?',
      feynmanPrompt:
        'Check understanding of centralised validation and consistency between construction and mutation',
    });

    const javaBlock2_1c = await Block.create({
      lessonId: javaLesson2_1._id,
      title: 'Static Members and Methods',
      description: 'Shared class-level state and utility methods',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'static members (fields and methods) belong to the class, not to any individual object. A static field is shared across all instances. static methods can be called without creating an object and can only access other static members.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Counter {
  private static int count = 0;
  private int id;

  public Counter() {
    count++;
    id = count;
  }

  public static int getCount() { return count; }
  public int getId() { return id; }

  public static void main(String[] args) {
    Counter a = new Counter();
    Counter b = new Counter();
    Counter c = new Counter();

    System.out.println("Total created : " + Counter.getCount());
    System.out.println("c has id      : " + c.getId());
  }
}`,
            explanation:
              'count is shared by all instances — each new Counter increments the same variable. getCount() is static so it is called on the class itself (Counter.getCount()), not on an object.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise9._id, required: true },
        },
      ]),
      feynmanQuestion:
        'What happens to a static field when you create a new instance?',
      feynmanPrompt:
        'Verify the user understands that static fields are shared and not reset per object',
    });

    const javaBlock2_2 = await Block.create({
      lessonId: javaLesson2_2._id,
      title: 'Inheritance and Interfaces',
      description: 'Extending classes and implementing contracts',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java supports single inheritance with extends: a subclass inherits fields and methods from its superclass and can override them. Interfaces (interface / implements) define a contract of methods without implementation, enabling a form of multiple inheritance and loose coupling.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `interface Speakable {
  void speak();
}

class Animal {
  void breathe() {
    System.out.println("Breathing...");
  }
}

class Dog extends Animal implements Speakable {
  public void speak() {
    System.out.println("Woof!");
  }
}

public class Main {
  public static void main(String[] args) {
    Dog dog = new Dog();
    dog.breathe();
    dog.speak();
  }
}`,
            explanation:
              'Dog extends Animal to inherit breathe(), and implements Speakable to fulfil the speak() contract.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise10._id, required: true },
        },
      ]),
      feynmanQuestion: 'What is the difference between extends and implements?',
      feynmanPrompt:
        'Ask the user to explain interface contracts vs class inheritance and when to use each',
    });

    const javaBlock2_2b = await Block.create({
      lessonId: javaLesson2_2._id,
      title: 'Abstract Classes and Polymorphism',
      description: 'Abstract behavior and dynamic dispatch',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'An abstract class in Java is declared with the abstract keyword and cannot be instantiated. It may contain abstract methods (no body) that subclasses must implement, and concrete methods that subclasses inherit. Polymorphism lets you write code against the superclass type and have the correct subclass method called at runtime.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `abstract class Shape {
  abstract double area();

  void printArea() {
    System.out.printf("Area: %.2f%n", area());
  }
}

class Circle extends Shape {
  double r;
  Circle(double r) { this.r = r; }
  double area() { return Math.PI * r * r; }
}

class Triangle extends Shape {
  double base, height;
  Triangle(double b, double h) { base = b; height = h; }
  double area() { return 0.5 * base * height; }
}

public class Main {
  public static void main(String[] args) {
    Shape[] shapes = { new Circle(5), new Triangle(6, 4) };
    for (Shape s : shapes) s.printArea();
  }
}`,
            explanation:
              'Both Circle and Triangle are stored as Shape references. When printArea() calls area(), Java dispatches to the correct subclass implementation at runtime.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise11._id, required: true },
        },
      ]),
      feynmanQuestion:
        'How does Java know which area() method to call at runtime?',
      feynmanPrompt:
        'Check understanding of dynamic dispatch and the role of the reference type vs the actual object type',
    });

    const javaBlock2_2c = await Block.create({
      lessonId: javaLesson2_2._id,
      title: 'Default Interface Methods',
      description: 'Interface defaults and conflict resolution',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: "Java 8 introduced default methods on interfaces, allowing you to add method implementations without breaking existing implementing classes. A class can implement multiple interfaces, resolving conflicts by overriding the ambiguous method. Functional interfaces (exactly one abstract method) power Java's lambda expressions.",
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `interface Flyable {
  void fly();
  default String describe() { return "I can fly"; }
}

interface Swimmable {
  void swim();
  default String describe() { return "I can swim"; }
}

class Duck implements Flyable, Swimmable {
  public void fly()  { System.out.println("Duck flying!"); }
  public void swim() { System.out.println("Duck swimming!"); }

  public String describe() {
    return Flyable.super.describe() + " and swim";
  }
}

public class Main {
  public static void main(String[] args) {
    Duck duck = new Duck();
    duck.fly();
    duck.swim();
    System.out.println(duck.describe());
  }
}`,
            explanation:
              'Both interfaces have a describe() default method. Java forces Duck to override it to resolve the ambiguity. Flyable.super.describe() calls a specific interface default explicitly.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: javaExercise12._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Why must Duck override describe() when implementing both interfaces?',
      feynmanPrompt:
        'Verify the user understands the diamond problem and how Java resolves it by requiring an explicit override',
    });

    console.log('✓ Java Blocks created: 12 blocks');

    // ─── Link Java blocks to lessons ─────────────────────────────────────────

    console.log('\n🔗 Linking blocks to Java lessons...');
    javaLesson1_1.blocks = [
      javaBlock1_1._id,
      javaBlock1_1b._id,
      javaBlock1_1c._id,
    ];
    javaLesson1_2.blocks = [
      javaBlock1_2._id,
      javaBlock1_2b._id,
      javaBlock1_2c._id,
    ];
    javaLesson2_1.blocks = [
      javaBlock2_1._id,
      javaBlock2_1b._id,
      javaBlock2_1c._id,
    ];
    javaLesson2_2.blocks = [
      javaBlock2_2._id,
      javaBlock2_2b._id,
      javaBlock2_2c._id,
    ];

    await Promise.all([
      javaLesson1_1.save(),
      javaLesson1_2.save(),
      javaLesson2_1.save(),
      javaLesson2_2.save(),
    ]);
    console.log('✓ Blocks linked to Java lessons');

    // ─── Done ─────────────────────────────────────────────────────────────────

    console.log('\n✨ Seed complete!');
    console.log('\nSummary:');
    console.log('  🌐 language_info : 2');
    console.log('  📚 Roadmaps      : 2 (C++, Java)');
    console.log('  🎯 Milestones    : 4');
    console.log('  📖 Lessons       : 8');
    console.log('  🧩 Blocks        : 24  (3 blocks per lesson)');
    console.log('  💪 Exercises     : 25');

    if (disconnectAfter) {
      await mongoose.disconnect();
      console.log('✓ Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('❌ Seed failed:', error);
    if (disconnectAfter) {
      await mongoose.disconnect().catch(() => undefined);
    }
    throw error;
  }
};

if (require.main === module) {
  seed(true).catch((error: unknown) => {
    console.error('Seed execution failed:', error);
    process.exitCode = 1;
  });
}
