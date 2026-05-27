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

    const exercise2 = await Exercise.create({
      lessonId: lesson1_1._id,
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

    console.log('✓ Exercises created: 2 exercises');

    // ─── Insert Blocks (combined theory + code + practice per block) ─────────

    console.log('\n🧩 Creating Blocks...');

    // ── Lesson 1.1: Variables and Data Types ──────────────────────────────────
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

    // ── Lesson 1.1 Block 2: Primitive Data Types ─────────────────────────────
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
  int i = 2147483647;       // max int
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
      ]),
      feynmanQuestion: 'Khi nào bạn chọn int thay vì double?',
      feynmanPrompt:
        'Kiểm tra xem người dùng hiểu sự khác biệt giữa các kiểu số nguyên và số thực',
    });

    // ── Lesson 1.1 Block 3: Type Casting and Constants ────────────────────────
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

  // implicit: int → double
  double area = PI * radius * radius;

  // explicit: double → int (truncates)
  int approxArea = static_cast<int>(area);

  cout << "Exact area  : " << area      << endl;
  cout << "Approx area : " << approxArea << endl;
  return 0;
}`,
            explanation:
              'PI là hằng số không thể thay đổi. Khi nhân int với double, int được tự động chuyển sang double (implicit cast). static_cast<int> chuyển ngược lại và cắt bỏ phần thập phân.',
          },
        },
      ]),
      feynmanQuestion: 'Tại sao explicit casting đôi khi gây mất dữ liệu?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích điều gì xảy ra với phần thập phân khi ép kiểu từ double sang int',
    });

    // ── Lesson 1.2: Control Flow and Loops ───────────────────────────────────
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
      ]),
      feynmanQuestion: 'Tại sao chúng ta cần các câu lệnh điều khiển luồng?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có hiểu lợi ích của việc sử dụng if-else và vòng lặp không',
    });

    // ── Lesson 1.2 Block 2: Switch-Case ──────────────────────────────────────
    const block1_2b = await Block.create({
      lessonId: lesson1_2._id,
      title: 'Switch-Case and Nested Conditions',
      description: 'Multi-branch selection with switch-case',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'switch-case là lựa chọn thay thế cho chuỗi if-else khi so sánh một biến với nhiều giá trị cố định. Mỗi case cần có break để tránh fall-through. default xử lý tất cả các trường hợp còn lại. Nested if lồng nhau cho phép kiểm tra điều kiện phức tạp hơn.',
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
      ]),
      feynmanQuestion: 'Khi nào nên dùng switch thay vì if-else?',
      feynmanPrompt:
        'Kiểm tra xem người dùng có biết khi nào switch rõ ràng hơn và khi nào if-else linh hoạt hơn',
    });

    // ── Lesson 1.2 Block 3: While and Do-While Loops ──────────────────────────
    const block1_2c = await Block.create({
      lessonId: lesson1_2._id,
      title: 'While and Do-While Loops',
      description: 'Condition-driven repetition in C++',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'while lặp lại khi điều kiện còn đúng, kiểm tra trước khi thực thi. do-while luôn thực thi ít nhất một lần vì kiểm tra điều kiện sau mỗi vòng. Dùng while khi số lần lặp chưa biết trước, for khi đã biết số lần. break thoát vòng lặp ngay lập tức, continue bỏ qua phần còn lại của vòng lặp hiện tại.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

int main() {
  // while: sum until exceeds 50
  int sum = 0, n = 1;
  while (sum <= 50) {
    sum += n++;
  }
  cout << "First sum > 50: " << sum << " (n=" << n-1 << ")" << endl;

  // do-while: always runs once
  int x = 100;
  do {
    cout << "do-while ran with x=" << x << endl;
  } while (x < 10);

  return 0;
}`,
            explanation:
              'Vòng while cộng dồn đến khi sum vượt 50. Vòng do-while chạy một lần dù x=100 không thỏa điều kiện x<10 — điều này không thể xảy ra với while thông thường.',
          },
        },
      ]),
      feynmanQuestion: 'Sự khác nhau giữa while và do-while là gì?',
      feynmanPrompt:
        'Yêu cầu người dùng mô tả tình huống thực tế mà do-while phù hợp hơn while',
    });

    // ── Lesson 2.1: Classes and Objects ───────────────────────────────────────
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
      ]),
      feynmanQuestion: 'Class là gì và nó khác gì với object?',
      feynmanPrompt:
        'Kiểm tra sự hiểu biết về sự khác biệt giữa class definition và instance',
    });

    // ── Lesson 2.1 Block 2: Constructors and Destructors ─────────────────────
    const block2_1b = await Block.create({
      lessonId: lesson2_1._id,
      title: 'Constructors and Destructors',
      description: 'Object lifecycle management in C++',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Constructor là phương thức đặc biệt được gọi tự động khi object được tạo ra. Có thể có nhiều constructor với các tham số khác nhau (constructor overloading). Destructor (~ClassName) được gọi khi object bị hủy, thường dùng để giải phóng bộ nhớ. Nếu không khai báo, C++ tự tạo constructor và destructor mặc định.',
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
      ]),
      feynmanQuestion: 'Khi nào destructor được gọi?',
      feynmanPrompt:
        'Kiểm tra hiểu biết về vòng đời object và tại sao destructor quan trọng khi dùng bộ nhớ động',
    });

    // ── Lesson 2.1 Block 3: Access Modifiers and Encapsulation ───────────────
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
      ]),
      feynmanQuestion:
        'Tại sao chúng ta nên dùng private thay vì public cho dữ liệu?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích lợi ích của encapsulation bằng ví dụ thực tế',
    });

    // ── Lesson 2.2: Inheritance and Polymorphism ──────────────────────────────
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
      ]),
      feynmanQuestion: 'Tại sao chúng ta sử dụng virtual functions ở đây?',
      feynmanPrompt:
        'Yêu cầu người dùng giải thích lợi ích của polymorphism và cho ví dụ thực tế',
    });

    // ── Lesson 2.2 Block 2: Abstract Classes ──────────────────────────────────
    const block2_2b = await Block.create({
      lessonId: lesson2_2._id,
      title: 'Abstract Classes and Pure Virtual Functions',
      description: 'Defining interfaces through abstract base classes',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Abstract class là class không thể tạo object trực tiếp. Nó chứa ít nhất một pure virtual function (khai báo với = 0). Mọi class con đều phải override tất cả pure virtual functions để có thể được khởi tạo. Abstract class đóng vai trò như một "hợp đồng" buộc các class con phải cài đặt hành vi cụ thể.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `#include <iostream>
using namespace std;

class Shape {         // abstract class
public:
  virtual double area() const = 0;   // pure virtual
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
      ]),
      feynmanQuestion: 'Tại sao không thể tạo object từ abstract class?',
      feynmanPrompt:
        'Kiểm tra xem người dùng hiểu tại sao abstract class tồn tại và khác gì so với class thông thường',
    });

    // ── Lesson 2.2 Block 3: Operator Overloading ──────────────────────────────
    const block2_2c = await Block.create({
      lessonId: lesson2_2._id,
      title: 'Operator Overloading',
      description: 'Redefining operators for custom types',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'C++ cho phép định nghĩa lại hành vi của các toán tử (+, -, *, ==, <<, v.v.) cho class tự tạo. Điều này giúp code trở nên trực quan hơn — ví dụ: cộng hai vector bằng v1 + v2 thay vì gọi hàm add(v1, v2). Operator overloading là một dạng polymorphism tĩnh (static polymorphism).',
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
      ]),
      feynmanQuestion:
        'Lợi ích của operator overloading so với việc dùng hàm thông thường là gì?',
      feynmanPrompt:
        'Yêu cầu người dùng so sánh v1 + v2 với add(v1, v2) về mặt tính dễ đọc và sử dụng',
    });

    console.log('✓ C++ blocks created: 12 blocks');

    // ─── Link blocks to C++ lessons ──────────────────────────────────────────

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
      ]),
      feynmanQuestion: 'Explain Java variable types in your own words',
      feynmanPrompt:
        'Check understanding of primitives vs reference types and why the distinction matters',
    });

    // ── Java Lesson 1.1 Block 2: Type Casting and Wrapper Classes ────────────
    const javaBlock1_1b = await Block.create({
      lessonId: javaLesson1_1._id,
      title: 'Casting and Wrapper Types',
      description: 'Type conversion and primitive wrapper classes',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java supports widening (implicit) and narrowing (explicit) type casting between primitives. Widening is safe and automatic (int → long → double), while narrowing requires an explicit cast and may lose data (double → int). Wrapper classes (Integer, Double, Boolean, etc.) wrap primitives as objects, enabling use in collections and providing utility methods. Autoboxing/unboxing converts between primitives and their wrappers automatically.',
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

    // Wrapper classes
    Integer wrapped = Integer.valueOf(i);  // boxing
    int unwrapped = wrapped;               // unboxing
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
      ]),
      feynmanQuestion: 'Why does narrowing require an explicit cast in Java?',
      feynmanPrompt:
        'Check whether the user understands potential data loss and why the compiler forces explicit acknowledgement',
    });

    // ── Java Lesson 1.1 Block 3: String Operations ────────────────────────────
    const javaBlock1_1c = await Block.create({
      lessonId: javaLesson1_1._id,
      title: 'String Basics and StringBuilder',
      description: 'Immutable strings and efficient text building',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'In Java, String is an immutable reference type — once created its value cannot change; operations like concatenation return new String objects. Key methods include length(), charAt(), substring(), toUpperCase(), toLowerCase(), contains(), replace(), split(), and trim(). String.format() or the + operator are used to build formatted output. StringBuilder is preferred for repeated modifications in loops due to better performance.',
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

    // StringBuilder for efficient concatenation
    StringBuilder sb = new StringBuilder();
    for (int i = 1; i <= 5; i++) sb.append(i).append(" ");
    System.out.println("Built   : " + sb.toString().trim());
  }
}`,
            explanation:
              'trim() removes leading/trailing spaces. substring(0,5) extracts "Alice". StringBuilder avoids creating a new String object on every loop iteration, which matters at scale.',
          },
        },
      ]),
      feynmanQuestion:
        'Why should you use StringBuilder instead of + in a loop?',
      feynmanPrompt:
        'Verify understanding of String immutability and the performance cost of repeated concatenation',
    });

    // ── Java Lesson 1.2: Control Flow ─────────────────────────────────────────
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
      ]),
      feynmanQuestion: 'Why do we need control flow statements?',
      feynmanPrompt:
        'Verify understanding of branching and loops; ask for a real-world analogy',
    });

    // ── Java Lesson 1.2 Block 2: Switch Expressions and Ternary ──────────────
    const javaBlock1_2b = await Block.create({
      lessonId: javaLesson1_2._id,
      title: 'Switch Expressions and Ternary',
      description: 'Multi-branch selection and concise conditions',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Java 14+ introduced switch expressions with arrow syntax (->), eliminating the need for break and allowing a switch to return a value directly. The ternary operator (condition ? a : b) provides a concise inline alternative to simple if-else. Using the right construct improves readability: switch expressions for multi-value dispatch, ternary for simple two-branch assignments.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    int month = 4;

    // Switch expression (Java 14+)
    String season = switch (month) {
      case 12, 1, 2  -> "Winter";
      case 3,  4, 5  -> "Spring";
      case 6,  7, 8  -> "Summer";
      default        -> "Autumn";
    };
    System.out.println("Season: " + season);

    // Ternary
    int score = 75;
    String grade = score >= 60 ? "Pass" : "Fail";
    System.out.println("Grade: " + grade);
  }
}`,
            explanation:
              'The switch expression directly assigns to season with no break needed. Multiple case labels can share one branch (12, 1, 2). The ternary evaluates score in one expression.',
          },
        },
      ]),
      feynmanQuestion:
        'What advantage does the switch expression have over the traditional switch statement?',
      feynmanPrompt:
        'Check understanding of arrow syntax, no fall-through, and the ability to return a value',
    });

    // ── Java Lesson 1.2 Block 3: Break, Continue, and Nested Loops ───────────
    const javaBlock1_2c = await Block.create({
      lessonId: javaLesson1_2._id,
      title: 'Break, Continue, and Nested Loops',
      description: 'Loop control and labeled flow statements',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'break immediately exits the nearest enclosing loop or switch. continue skips the rest of the current iteration and moves to the next. Labeled break and continue let you target an outer loop in nested loops — useful when you need to exit multiple levels at once. The enhanced for-each loop (for (T item : collection)) simplifies iteration over arrays and collections.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `public class Main {
  public static void main(String[] args) {
    // continue: skip even numbers
    for (int i = 1; i <= 8; i++) {
      if (i % 2 == 0) continue;
      System.out.print(i + " ");
    }
    System.out.println();

    // labeled break: exit outer loop
    outer:
    for (int r = 0; r < 3; r++) {
      for (int c = 0; c < 3; c++) {
        if (r == 1 && c == 1) break outer;
        System.out.print("[" + r + "," + c + "] ");
      }
    }
    System.out.println("\nDone");

    // for-each
    int[] nums = {10, 20, 30};
    for (int n : nums) System.out.print(n + " ");
  }
}`,
            explanation:
              'continue skips even numbers, printing only odds. The labeled break outer exits both loops when row=1, col=1 is reached. for-each iterates the array cleanly without an index variable.',
          },
        },
      ]),
      feynmanQuestion:
        'When would you use a labeled break instead of a regular break?',
      feynmanPrompt:
        'Ask the user to describe a scenario where a labeled break is necessary and what would happen without the label',
    });

    // ── Java Lesson 2.1: Classes and Objects ──────────────────────────────────
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
      ]),
      feynmanQuestion: 'What is the difference between a class and an object?',
      feynmanPrompt:
        'Check class vs instance understanding; ask for an everyday analogy',
    });

    // ── Java Lesson 2.1 Block 2: Getters, Setters, and Encapsulation ─────────
    const javaBlock2_1b = await Block.create({
      lessonId: javaLesson2_1._id,
      title: 'Getters, Setters, and Encapsulation',
      description: 'Controlled access and validation',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Encapsulation in Java means declaring fields private and exposing controlled access through public getter and setter methods. Getters return the field value; setters validate input before updating it. This protects the internal state from invalid or unexpected changes. IDEs can auto-generate getters/setters, and Java records (Java 16+) generate them implicitly for immutable data carriers.',
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
    setAge(age);   // use setter for validation
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
    s.setAge(-5);   // rejected by validation
    System.out.println(s);
  }
}`,
            explanation:
              'setAge rejects the invalid value -5, so age stays 20. Calling the setter from the constructor ensures validation runs even at creation time. toString() lets System.out.println work directly.',
          },
        },
      ]),
      feynmanQuestion:
        'Why call the setter inside the constructor instead of assigning the field directly?',
      feynmanPrompt:
        'Check understanding of centralised validation and consistency between construction and mutation',
    });

    // ── Java Lesson 2.1 Block 3: Static Members and Methods ──────────────────
    const javaBlock2_1c = await Block.create({
      lessonId: javaLesson2_1._id,
      title: 'Static Members and Methods',
      description: 'Shared class-level state and utility methods',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'static members (fields and methods) belong to the class, not to any individual object. A static field is shared across all instances. static methods can be called without creating an object and can only access other static members. Common uses: utility/helper methods (Math.sqrt()), constants (Math.PI), factory methods, and counters shared across instances.',
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
      ]),
      feynmanQuestion:
        'What happens to a static field when you create a new instance?',
      feynmanPrompt:
        'Verify the user understands that static fields are shared and not reset per object',
    });

    // ── Java Lesson 2.2: Inheritance and Interfaces ───────────────────────────
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

    // ── Java Lesson 2.2 Block 2: Abstract Classes and Polymorphism ───────────
    const javaBlock2_2b = await Block.create({
      lessonId: javaLesson2_2._id,
      title: 'Abstract Classes and Polymorphism',
      description: 'Abstract behavior and dynamic dispatch',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'An abstract class in Java is declared with the abstract keyword and cannot be instantiated. It may contain abstract methods (no body) that subclasses must implement, and concrete methods that subclasses inherit. Polymorphism lets you write code against the superclass type (Shape s) and have the correct subclass method called at runtime — this is dynamic dispatch.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `abstract class Shape {
  abstract double area();

  void printArea() {   // concrete shared method
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
    for (Shape s : shapes) s.printArea();  // polymorphic call
  }
}`,
            explanation:
              'Both Circle and Triangle are stored as Shape references. When printArea() calls area(), Java dispatches to the correct subclass implementation at runtime — polymorphism in action.',
          },
        },
      ]),
      feynmanQuestion:
        'How does Java know which area() method to call at runtime?',
      feynmanPrompt:
        'Check understanding of dynamic dispatch and the role of the reference type vs the actual object type',
    });

    // ── Java Lesson 2.2 Block 3: Default Interface Methods ───────────────────
    const javaBlock2_2c = await Block.create({
      lessonId: javaLesson2_2._id,
      title: 'Default Interface Methods',
      description: 'Interface defaults and conflict resolution',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: "Java 8 introduced default methods on interfaces, allowing you to add method implementations without breaking existing implementing classes. A class can implement multiple interfaces (multiple inheritance of type), resolving conflicts by overriding the ambiguous method. Functional interfaces (exactly one abstract method) power Java's lambda expressions, making code more concise.",
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

  // Must override conflicting default
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
      ]),
      feynmanQuestion:
        'Why must Duck override describe() when implementing both interfaces?',
      feynmanPrompt:
        'Verify the user understands the diamond problem and how Java resolves it by requiring an explicit override',
    });

    console.log('✓ Java blocks created: 12 blocks');

    // ─── Link blocks to Java lessons ─────────────────────────────────────────

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
    console.log(`  🌐 language_info : 2`);
    console.log(`  📚 Roadmaps      : 2 (C++, Java)`);
    console.log(`  🎯 Milestones    : 4`);
    console.log(`  📖 Lessons       : 8`);
    console.log(`  🧩 Blocks        : 24  (3 blocks per lesson)`);
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
