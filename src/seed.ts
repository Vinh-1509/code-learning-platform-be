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
import { LanguageInfo } from './models/language_info.model';
import type { IBlock } from './interfaces/learning_system.interface';

const asBlockContent = (content: IBlock['content']) => content;

const seed = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Clear collections
    console.log('\n📝 Clearing collections...');
    await Promise.all([
      Roadmap.deleteMany({}),
      Milestone.deleteMany({}),
      Lesson.deleteMany({}),
      Block.deleteMany({}),
      UserLessonProgress.deleteMany({}),
      UserMilestoneProgress.deleteMany({}),
      Exercise.deleteMany({}),
      LanguageInfo.deleteMany({}),
    ]);
    console.log('✓ Collections cleared');

    // ─── Insert language_info ───────────────────────────────────────────────

    console.log('\n🌐 Creating language_info...');
    await LanguageInfo.insertMany([
      {
        language: 'C++',
        info: 'C++ is a general-purpose programming language supporting procedural, object-oriented, and generic programming. Widely used for systems programming and competitive programming.',
      },
      {
        language: 'Java',
        info: 'Java is a high-level, class-based, object-oriented language designed to have as few implementation dependencies as possible. Runs on the JVM and is widely used in enterprise applications.',
      },
    ]);
    console.log('✓ language_info created: C++, Java');

    // ─── Insert Roadmaps (C++ & Java) ────────────────────────────────────────

    console.log('\n📚 Creating Roadmaps...');
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

    // ─── Insert Milestones ───────────────────────────────────────────────────

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
      `✓ Milestones created: ${String(milestone1._id)}, ${String(
        milestone2._id,
      )}`,
    );

    // ─── Insert Lessons ──────────────────────────────────────────────────────

    console.log('\n📖 Creating Lessons...');

    // Milestone 1 - Lesson 1
    const lesson1_1 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Variables and Data Types',
      order: 1,
      blocks: [],
    });

    // Milestone 1 - Lesson 2
    const lesson1_2 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Control Flow and Loops',
      order: 2,
      blocks: [],
    });

    // Milestone 2 - Lesson 1
    const lesson2_1 = await Lesson.create({
      milestoneId: milestone2._id,
      title: 'Classes and Objects',
      order: 1,
      blocks: [],
    });

    // Milestone 2 - Lesson 2
    const lesson2_2 = await Lesson.create({
      milestoneId: milestone2._id,
      title: 'Inheritance and Polymorphism',
      order: 2,
      blocks: [],
    });

    console.log(`✓ Lessons created: 4 lessons`);

    // ─── Insert Blocks ───────────────────────────────────────────────────────

    console.log('\n🧩 Creating Blocks...');

    // Lesson 1.1 - Theory Block
    const block1_1_1 = await Block.create({
      lessonId: lesson1_1._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Variables là những vùng bộ nhớ dùng để lưu trữ dữ liệu. Mỗi biến có một tên (identifier) và kiểu dữ liệu (data type).',
          },
        },
      ]),
      feynmanQuestion: 'Giải thích biến trong C++ bằng những từ của chính bạn',
      feynmanPrompt:
        'Hãy kiểm tra xem người dùng có thực sự hiểu khái niệm biến không',
    });

    // Lesson 1.1 - Code Block
    const block1_1_2 = await Block.create({
      lessonId: lesson1_1._id,
      content: asBlockContent([
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
      ]),
      feynmanQuestion: 'Làm thế nào mã này khai báo và sử dụng các biến?',
      feynmanPrompt: 'Yêu cầu người dùng giải thích từng dòng khai báo biến',
    });

    // Lesson 1.1 - Exercises (before practice blocks so IDs are valid)
    console.log('\n💪 Creating Exercises for lesson 1.1...');

    const exercise1 = await Exercise.create({
      lessonId: lesson1_1._id,
      title: 'Declare Student Variables',
      instruction:
        'Khai báo các biến để lưu thông tin của một sinh viên: tên (string), tuổi (int), và điểm (double)',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          '____ ',
          ' name = "John";\nint ',
          ' = 20;\ndouble ',
          ' = 95.5;',
        ],
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

    const exercise2 = await Exercise.create({
      lessonId: lesson1_1._id,
      title: 'Output Variable Values',
      instruction: 'Viết mã để in ra giá trị của các biến: name, age, và score',
      language: 'C++',
      type: 'fill_blank',
      level: 'easy',
      data: {
        template: [
          'cout << "Name: " << name << ____ << age << ____ << score << endl;',
        ],
        placeholders: {
          input_1: 'endl;\\ncout << "Age: "',
          input_2: 'endl;\\ncout << "Score: "',
        },
      },
      correctAnswer: {
        input_1: 'endl;\ncout << "Age: "',
        input_2: 'endl;\ncout << "Score: "',
      },
      explanation:
        'Sử dụng cout để in ra các biến. Mỗi dòng thông tin nên kết thúc bằng endl hoặc "\\n" để xuống dòng.',
      hints: {
        '1': 'Cần xuống dòng và in "Age: " trước khi in giá trị age',
        '2': 'Tương tự, cần xuống dòng và in "Score: " trước khi in giá trị score',
      },
      order: 2,
    });

    console.log(`✓ Exercises created: 2 exercises`);

    // Lesson 1.1 - Practice blocks (one exercise per block)
    const block1_1_3 = await Block.create({
      lessonId: lesson1_1._id,
      content: asBlockContent([
        {
          type: 'practice',
          data: {
            order: 3,
            exerciseId: exercise1._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion: 'Hãy tạo các biến để lưu thông tin của bạn',
      feynmanPrompt: 'Hướng dẫn người dùng tạo một chương trình khai báo biến',
    });

    const block1_1_4 = await Block.create({
      lessonId: lesson1_1._id,
      content: asBlockContent([
        {
          type: 'practice',
          data: {
            order: 4,
            exerciseId: exercise2._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion: 'Làm thế nào để in ra các biến đã khai báo?',
      feynmanPrompt: 'Hướng dẫn người dùng sử dụng cout để in từng giá trị',
    });

    // Lesson 1.2 - Theory Block
    const block1_2_1 = await Block.create({
      lessonId: lesson1_2._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Điều khiển luồng (Control Flow) cho phép bạn quyết định những phần mã nào sẽ được thực thi. Có ba loại chính: if-else, switch-case, và vòng lặp.',
          },
        },
      ]),
      feynmanQuestion: 'Tại sao chúng ta cần các câu lệnh điều khiển?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có hiểu lợi ích của việc sử dụng if-else không',
    });

    // Lesson 1.2 - Code Block
    const block1_2_2 = await Block.create({
      lessonId: lesson1_2._id,
      content: asBlockContent([
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
      ]),
      feynmanQuestion: 'Giải thích cách hoạt động của vòng lặp for này',
      feynmanPrompt: 'Yêu cầu người dùng mô tả từng bước lặp',
    });

    // Lesson 2.1 - Theory Block
    const block2_1_1 = await Block.create({
      lessonId: lesson2_1._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Một class là một khuôn mẫu (template) để tạo ra các objects. Nó chứa các thuộc tính (attributes) và phương thức (methods).',
          },
        },
      ]),
      feynmanQuestion: 'Class là gì và nó khác gì với object?',
      feynmanPrompt:
        'Kiểm tra sự hiểu biết về sự khác biệt giữa class và instance',
    });

    // Lesson 2.1 - Code Block
    const block2_1_2 = await Block.create({
      lessonId: lesson2_1._id,
      content: asBlockContent([
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
      ]),
      feynmanQuestion: 'Giải thích cấu trúc của class này',
      feynmanPrompt:
        'Yêu cầu người dùng mô tả constructor và các phương thức công khai',
    });

    // Lesson 2.2 - Theory Block
    const block2_2_1 = await Block.create({
      lessonId: lesson2_2._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Inheritance cho phép một class kế thừa các thuộc tính và phương thức từ class khác. Polymorphism cho phép các object của các class khác nhau phản ứng theo những cách khác nhau với cùng một thông điệp.',
          },
        },
      ]),
      feynmanQuestion: 'Giải thích khái niệm inheritance và polymorphism',
      feynmanPrompt: 'Kiểm tra xem người dùng có thể đưa ra ví dụ thực tế',
    });

    // Lesson 2.2 - Code Block
    const block2_2_2 = await Block.create({
      lessonId: lesson2_2._id,
      content: asBlockContent([
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
              'Dog và Cat kế thừa từ Animal. Mỗi class ghi đè (override) phương thức sound() để phát ra âm thanh khác nhau. Đây là ví dụ của polymorphism.',
          },
        },
      ]),
      feynmanQuestion: 'Tại sao chúng ta sử dụng virtual functions ở đây?',
      feynmanPrompt: 'Yêu cầu người dùng giải thích lợi ích của polymorphism',
    });

    console.log(`✓ C++ blocks created: 10 blocks`);

    // Update lesson blocks arrays with block IDs
    console.log('\n🔗 Linking blocks to lessons...');
    lesson1_1.blocks = [
      block1_1_1._id,
      block1_1_2._id,
      block1_1_3._id,
      block1_1_4._id,
    ];
    lesson1_2.blocks = [block1_2_1._id, block1_2_2._id];
    lesson2_1.blocks = [block2_1_1._id, block2_1_2._id];
    lesson2_2.blocks = [block2_2_1._id, block2_2_2._id];

    await Promise.all([
      lesson1_1.save(),
      lesson1_2.save(),
      lesson2_1.save(),
      lesson2_2.save(),
    ]);
    console.log('✓ Blocks linked to lessons');

    // ─── Java roadmap (milestones, lessons, blocks) ──────────────────────────

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

    const javaBlock1_1_1 = await Block.create({
      lessonId: javaLesson1_1._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'In Java, variables are declared with a type. Primitive types include int, double, boolean, and char.',
          },
        },
      ]),
      feynmanQuestion: 'Explain Java variable types in your own words',
      feynmanPrompt: 'Check understanding of primitives vs reference types',
    });

    const javaBlock1_1_2 = await Block.create({
      lessonId: javaLesson1_1._id,
      content: asBlockContent([
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    int age = 25;
    String name = "Alice";
    System.out.println(name + " is " + age);
  }
}`,
            explanation: 'Declares an int and a String, then prints them.',
          },
        },
      ]),
      feynmanQuestion: 'How does this Java program declare and use variables?',
      feynmanPrompt: 'Ask the user to explain each declaration',
    });

    const javaBlock1_2_1 = await Block.create({
      lessonId: javaLesson1_2._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java uses if-else, switch, for, while, and do-while for control flow.',
          },
        },
      ]),
      feynmanQuestion: 'Why do we need control flow statements?',
      feynmanPrompt: 'Verify understanding of branching and loops',
    });

    const javaBlock1_2_2 = await Block.create({
      lessonId: javaLesson1_2._id,
      content: asBlockContent([
        {
          type: 'code',
          data: {
            order: 2,
            code: `for (int i = 1; i <= 5; i++) {
  System.out.println(i);
}`,
            explanation: 'A simple for loop printing numbers 1 through 5.',
          },
        },
      ]),
      feynmanQuestion: 'Explain how this for loop works',
      feynmanPrompt: 'Walk through initialization, condition, and increment',
    });

    const javaBlock2_1_1 = await Block.create({
      lessonId: javaLesson2_1._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'A Java class defines fields and methods. Objects are instances created with new.',
          },
        },
      ]),
      feynmanQuestion: 'What is the difference between a class and an object?',
      feynmanPrompt: 'Check class vs instance understanding',
    });

    const javaBlock2_1_2 = await Block.create({
      lessonId: javaLesson2_1._id,
      content: asBlockContent([
        {
          type: 'code',
          data: {
            order: 2,
            code: `class Person {
  String name;
  Person(String name) { this.name = name; }
  void greet() { System.out.println("Hello, " + name); }
}`,
            explanation:
              'A minimal class with a field, constructor, and method.',
          },
        },
      ]),
      feynmanQuestion: 'Describe the parts of this Person class',
      feynmanPrompt: 'Ask about constructor and instance method',
    });

    const javaBlock2_2_1 = await Block.create({
      lessonId: javaLesson2_2._id,
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java supports inheritance with extends and polymorphism via method overriding and interfaces.',
          },
        },
      ]),
      feynmanQuestion: 'Explain inheritance and interfaces in Java',
      feynmanPrompt: 'Request a real-world analogy',
    });

    const javaBlock2_2_2 = await Block.create({
      lessonId: javaLesson2_2._id,
      content: asBlockContent([
        {
          type: 'code',
          data: {
            order: 2,
            code: `interface Speakable {
  void speak();
}
class Dog implements Speakable {
  public void speak() { System.out.println("Woof"); }
}`,
            explanation: 'Dog implements Speakable and defines speak().',
          },
        },
      ]),
      feynmanQuestion: 'What does implements mean here?',
      feynmanPrompt: 'Explain interface contract vs class implementation',
    });

    javaLesson1_1.blocks = [javaBlock1_1_1._id, javaBlock1_1_2._id];
    javaLesson1_2.blocks = [javaBlock1_2_1._id, javaBlock1_2_2._id];
    javaLesson2_1.blocks = [javaBlock2_1_1._id, javaBlock2_1_2._id];
    javaLesson2_2.blocks = [javaBlock2_2_1._id, javaBlock2_2_2._id];

    await Promise.all([
      javaLesson1_1.save(),
      javaLesson1_2.save(),
      javaLesson2_1.save(),
      javaLesson2_2.save(),
    ]);
    console.log('✓ Java learning path created');

    console.log('\n✨ Seed complete!');
    console.log('\nSummary:');
    console.log(`  🌐 language_info: 2`);
    console.log(`  📚 Roadmaps: 2 (C++, Java)`);
    console.log(`  🎯 Milestones: 4`);
    console.log(`  📖 Lessons: 8`);
    console.log(`  🧩 Blocks: 18`);
    console.log(`  💪 Exercises: 2`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect().catch(() => undefined);
    throw error;
  }
};

seed().catch((error: unknown) => {
  console.error('Seed execution failed:', error);
  process.exitCode = 1;
});
