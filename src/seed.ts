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
      `✓ Milestones created: ${String(milestone1._id)}, ${String(milestone2._id)}`,
    );

    // ─── Insert Lessons ──────────────────────────────────────────────────────

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

    // ─── Insert Exercises (must exist before practice blocks) ────────────────

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

    console.log('✓ Exercises created: 2 exercises');

    // ─── Insert Blocks (combined theory + code + practice per block) ─────────

    console.log('\n🧩 Creating Blocks...');

    // ── Lesson 1.1: Variables and Data Types ──────────────────────────────────
    const block1_1 = await Block.create({
      lessonId: lesson1_1._id,
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
          data: {
            order: 3,
            exerciseId: exercise1._id,
            required: true,
          },
        },
        {
          type: 'practice',
          data: {
            order: 4,
            exerciseId: exercise2._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion: 'Giải thích biến trong C++ bằng những từ của chính bạn',
      feynmanPrompt:
        'Hãy kiểm tra xem người dùng có thực sự hiểu khái niệm biến không',
    });

    // ── Lesson 1.2: Control Flow and Loops ───────────────────────────────────
    const block1_2 = await Block.create({
      lessonId: lesson1_2._id,
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
      ]),
      feynmanQuestion: 'Tại sao chúng ta cần các câu lệnh điều khiển luồng?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có hiểu lợi ích của việc sử dụng if-else và vòng lặp không',
    });

    // ── Lesson 2.1: Classes and Objects ──────────────────────────────────────
    const block2_1 = await Block.create({
      lessonId: lesson2_1._id,
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
      ]),
      feynmanQuestion: 'Class là gì và nó khác gì với object?',
      feynmanPrompt:
        'Kiểm tra sự hiểu biết về sự khác biệt giữa class definition và instance',
    });

    // ── Lesson 2.2: Inheritance and Polymorphism ──────────────────────────────
    const block2_2 = await Block.create({
      lessonId: lesson2_2._id,
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
      ]),
      feynmanQuestion: 'Tại sao chúng ta sử dụng virtual functions ở đây?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích lợi ích của polymorphism và cho ví dụ thực tế',
    });

    console.log('✓ C++ blocks created: 4 blocks');

    // ─── Link blocks to C++ lessons ──────────────────────────────────────────

    console.log('\n🔗 Linking blocks to C++ lessons...');
    lesson1_1.blocks = [block1_1._id];
    lesson1_2.blocks = [block1_2._id];
    lesson2_1.blocks = [block2_1._id];
    lesson2_2.blocks = [block2_2._id];

    await Promise.all([
      lesson1_1.save(),
      lesson1_2.save(),
      lesson2_1.save(),
      lesson2_2.save(),
    ]);
    console.log('✓ Blocks linked to C++ lessons');

    // ─── Java roadmap ────────────────────────────────────────────────────────

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

    // ── Java Lesson 1.1: Variables and Types ──────────────────────────────────
    const javaBlock1_1 = await Block.create({
      lessonId: javaLesson1_1._id,
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
      ]),
      feynmanQuestion: 'Explain Java variable types in your own words',
      feynmanPrompt:
        'Check understanding of primitives vs reference types and why the distinction matters',
    });

    // ── Java Lesson 1.2: Control Flow ─────────────────────────────────────────
    const javaBlock1_2 = await Block.create({
      lessonId: javaLesson1_2._id,
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
      ]),
      feynmanQuestion: 'Why do we need control flow statements?',
      feynmanPrompt:
        'Verify understanding of branching and loops; ask for a real-world analogy',
    });

    // ── Java Lesson 2.1: Classes and Objects ──────────────────────────────────
    const javaBlock2_1 = await Block.create({
      lessonId: javaLesson2_1._id,
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
      ]),
      feynmanQuestion: 'What is the difference between a class and an object?',
      feynmanPrompt:
        'Check class vs instance understanding; ask for an everyday analogy',
    });

    // ── Java Lesson 2.2: Inheritance and Interfaces ───────────────────────────
    const javaBlock2_2 = await Block.create({
      lessonId: javaLesson2_2._id,
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
    dog.breathe(); // inherited from Animal
    dog.speak();   // implemented from Speakable
  }
}`,
            explanation:
              'Dog extends Animal to inherit breathe(), and implements Speakable to fulfil the speak() contract. This shows both inheritance and interface implementation working together.',
          },
        },
      ]),
      feynmanQuestion: 'What is the difference between extends and implements?',
      feynmanPrompt:
        'Ask the user to explain interface contracts vs class inheritance and when to use each',
    });

    console.log('✓ Java blocks created: 4 blocks');

    // ─── Link blocks to Java lessons ─────────────────────────────────────────

    console.log('\n🔗 Linking blocks to Java lessons...');
    javaLesson1_1.blocks = [javaBlock1_1._id];
    javaLesson1_2.blocks = [javaBlock1_2._id];
    javaLesson2_1.blocks = [javaBlock2_1._id];
    javaLesson2_2.blocks = [javaBlock2_2._id];

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
    console.log(`  🌐 language_info : 2`);
    console.log(`  📚 Roadmaps      : 2 (C++, Java)`);
    console.log(`  🎯 Milestones    : 4`);
    console.log(`  📖 Lessons       : 8`);
    console.log(`  🧩 Blocks        : 8  (1 combined block per lesson)`);
    console.log(`  💪 Exercises     : 2`);

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
