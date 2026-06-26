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
import { ExerciseAttempt } from './models/exercise_attempt.model';
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
      ExerciseAttempt.deleteMany({}),
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
      {
        name: 'Environment Setup',
        description:
          'Installing tools, compiling, running, and verifying local development setup',
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
      title: 'C++ Learning Roadmap',
      description:
        'A Comprehensive Roadmap to Learning C++ Programming from Beginner to Advanced',
    });

    const roadmapJava = await Roadmap.create({
      language: 'Java',
      title: 'Java Learning Roadmap',
      description:
        'A Comprehensive Roadmap to Learning Java Programming from Beginner to Advanced',
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
        'Learn the fundamental concepts of C++: variables, data types, operators, and control flow.',
    });

    const milestone2 = await Milestone.create({
      roadmapId: roadmap._id,
      title: 'Object Oriented Programming',
      order: 2,
      description:
        'Understand and apply the principles of OOP: class, inheritance, polymorphism, encapsulation',
    });
    console.log(
      `✓ Milestones created: ${String(milestone1._id)}, ${String(milestone2._id)}`,
    );

    // ─── Lessons ─────────────────────────────────────────────────────────────

    console.log('\n📖 Creating Lessons...');

    const lesson1_setup = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Setup C++ Development Environment',
      order: 1,
      blocks: [],
    });

    const lesson1_1 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Variables and Data Types',
      order: 2,
      blocks: [],
    });

    const lesson1_2 = await Lesson.create({
      milestoneId: milestone1._id,
      title: 'Control Flow and Loops',
      order: 3,
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

    console.log('✓ C++ Lessons created: 5 lessons');

    // ─── C++ Exercises ───────────────────────────────────────────────────────

    console.log('\n💪 Creating C++ Exercises...');

    // Lesson 1.1 Block 1 — fill_blank
    const exerciseSetupCppVsCode = await Exercise.create({
      lessonId: lesson1_setup._id,
      tagId: tagIds('Environment Setup'),
      title: 'Install VS Code for C++',
      instruction: 'What is VS Code mainly used for when learning C++?',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'code editor', indent: 0 },
          { id: 'block-1', code: 'compiler', indent: 0 },
          { id: 'block-2', code: 'operating system', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'VS Code is an editor for writing and managing code files. After installing it, you can create your C++ source files there.',
      hints: {
        '1': 'An editor is where you write code; it is not the compiler.',
      },
      order: 1,
    });

    const exerciseSetupCppCompiler = await Exercise.create({
      lessonId: lesson1_setup._id,
      tagId: tagIds('Environment Setup'),
      title: 'Install C++ Compiler',
      instruction: 'Which tool is used to compile C++ source code?',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'g++', indent: 0 },
          { id: 'block-1', code: 'VS Code', indent: 0 },
          { id: 'block-2', code: 'java', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'C++ needs a compiler such as g++ to turn source code into a runnable program.',
      hints: {
        '1': 'The command for checking the C++ compiler usually starts with g++.',
      },
      order: 2,
    });

    const exerciseSetupCpp = await Exercise.create({
      lessonId: lesson1_setup._id,
      tagId: tagIds('Environment Setup', 'Input Output'),
      title: 'Run Your First C++ Program',
      instruction:
        'Choose the compile command first, then the run command for the sample C++ program.',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'g++ main.cpp -o main', indent: 0 },
          { id: 'block-1', code: './main', indent: 0 },
          { id: 'block-2', code: 'javac Main.java', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
      },
      explanation:
        'To run C++, you need an editor, a compiler, a .cpp file, a g++ compile command, and a command to run the output program.',
      hints: {
        '1': 'C++ needs a compiler such as g++ before it can run.',
        '2': 'A C++ source file usually ends with .cpp.',
      },
      order: 3,
    });

    const exercise1 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Variables', 'Data Types'),
      title: 'Declare Student Variables',
      instruction:
        'Declare variables to store information about a student: name (string), age (int), and score (double)',
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
        'To store a name, we use the string data type; for age, we use int; and for a score, we use double. The syntax for declaring a variable is: data_type variable_name = value;',
      hints: {
        '1': "A user's name should be a sequence of characters. Which keyword should be used to declare it?",
        '2': 'Age is an integer, so use `int`.',
        '3': 'A score can have a decimal part, so use `double`.',
      },
      order: 1,
    });

    // Lesson 1.1 Block 1 — fill_blank
    const exercise2 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Input Output', 'Variables'),
      title: 'Output Variable Values',
      instruction:
        'Write code to print the values of the variables: name, age, and score. Follow the format template below: "Name: John\nAge: 25\nScore: 10"',
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
        'Use cout to print the variables. Each line of information should end with endl or "\\n" to move to the next line.',
      hints: {
        '1': 'Need to move to the next line and print "Age: " before printing the value of age',
        '2': 'Similarly, need to move to the next line and print "Score: " before printing the value of score',
      },
      order: 2,
    });

    // Lesson 1.1 Block 2 — drag_drop
    const exercise3 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Data Types'),
      title: 'Match Data Types to Variables',
      instruction:
        'Drag and drop the values in order to match them with the following data types: int, double, char, bool',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 4,
        blocks: [
          { id: 'block-0', code: "'A'", indent: 0 },
          { id: 'block-1', code: 'true', indent: 0 },
          { id: 'block-2', code: '100', indent: 0 },
          { id: 'block-3', code: '3.14159', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-2',
        '2': 'block-3',
        '3': 'block-0',
        '4': 'block-1',
      },
      explanation:
        "int contains integers (100), double contains floating-point numbers (3.14159), char contains single characters in single quotes ('A'), bool contains true/false values.",
      hints: {
        '1': 'Select an integer for int',
        '2': 'Select a number with a decimal part for double',
        '3': 'Characters must be enclosed in single quotes',
        '4': 'bool has only two values: true or false',
      },
      order: 1,
    });

    // Lesson 1.1 Block 3 — fill_blank
    const exercise4 = await Exercise.create({
      lessonId: lesson1_1._id,
      tagId: tagIds('Type Conversion', 'Data Types'),
      title: 'Identify Casting Types',
      instruction:
        'Fill in the two keywords below in the appropriate positions: implicit (implicit), explicit (explicit)',
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
        'Implicit conversion from int to double is automatic (no data loss), so it is called implicit. Explicit conversion from double to int requires casting because it may lose the fractional part.',
      hints: {
        '1': 'What is the term for casting that does not require special syntax?',
        '2': 'What is the term for casting that requires the type to be specified in parentheses?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 1 — drag_drop
    const exercise5 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Operators', 'Control Flow'),
      title: 'Even or Odd Condition',
      instruction:
        'Select the correct operator to check if a number is even or odd',
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
        'The modulo operator (%) returns the remainder. If the remainder is 0, the number is even. Example: 4 % 2 = 0 (even), 5 % 2 = 1 (odd).',
      hints: {
        '1': 'Which operator calculates the remainder of a division?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 2 — fill_blank
    const exercise6 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Control Flow'),
      title: 'Complete Switch Statement',
      instruction:
        'Select the appropriate keywords to make the switch statement work correctly for the days of the week',
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
        'case checks the value. break exits the switch to avoid fall-through (continuing to execute the next case).',
      hints: {
        '1': 'What keyword is used to start a case block?',
        '2': 'What keyword is used to exit a switch statement?',
      },
      order: 1,
    });

    // Lesson 1.2 Block 3 — drag_drop
    const exercise7 = await Exercise.create({
      lessonId: lesson1_2._id,
      tagId: tagIds('Loops'),
      title: 'While Loop Syntax',
      instruction:
        'Which loop structure checks the condition before executing the block of code?',
      language: 'C++',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'do-while', indent: 0 },
          { id: 'block-1', code: 'for', indent: 0 },
          { id: 'block-2', code: 'while', indent: 0 },
          { id: 'block-3', code: 'if', indent: 0 },
          { id: 'block-4', code: 'switch', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-2',
      },
      explanation:
        'while loops while the condition is true. do-while also loops but checks the condition after execution. for is used when the number of iterations is known.',
      hints: {
        '1': 'What keyword is used to check the condition before executing a loop?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 1 — drag_drop
    const exercise8 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Access Modifiers',
      instruction:
        'Select the appropriate access modifiers: __ for private attributes, __ for public methods',
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
        'private limits access to within the class. public allows access from anywhere. protected allows access from derived classes.',
      hints: {
        '1': 'Which access modifier is used to hide data?',
        '2': 'Which access modifier is used for public methods?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 2 — fill_blank
    const exercise9 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Constructor Syntax',
      instruction: 'Fill in the appropriate constructor name for the Car class',
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
        'Constructor must have the same name as the class. It is called automatically when an object of the class is created to initialize the initial state.',
      hints: {
        '1': 'Constructor must have a name that matches the class name?',
      },
      order: 1,
    });

    // Lesson 2.1 Block 3 — drag_drop
    const exercise10 = await Exercise.create({
      lessonId: lesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Getter and Setter Methods',
      instruction:
        'Drag and drop the appropriate method names to access (get) and update the balance attribute of a class',
      language: 'C++',
      type: 'drag_drop',
      level: 'medium',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'getBalance', indent: 0 },
          { id: 'block-1', code: 'balance', indent: 0 },
          { id: 'block-2', code: 'readBalance', indent: 0 },
          { id: 'block-3', code: 'writeBalance', indent: 0 },
          { id: 'block-4', code: 'setBalance', indent: 0 },
          { id: 'block-5', code: 'get', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-4',
      },
      explanation:
        'Getter starts with "get" to retrieve the value of an attribute. Setter starts with "set" to assign a value with validation.',
      hints: {
        '1': 'What keyword is used to define a method that retrieves an attribute value?',
        '2': 'What keyword is used to define a method that assigns a value to an attribute?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 1 — fill_blank
    const exercise11 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Inheritance Syntax',
      instruction:
        'Fill in the appropriate keyword for Dog to inherit all attributes and methods of Animal',
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
        'Use ": public" to inherit from a parent class. Public inheritance keeps the parent public members accessible through the child class.',
      hints: {
        '1': 'What symbol and keyword are used for inheritance?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 2 — drag_drop
    const exercise12 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Virtual Function Override',
      instruction:
        'The __ keyword lets the compiler check whether a virtual method from the parent class is overridden correctly.',
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
        'override lets the compiler check whether a matching virtual method exists in the parent class. This helps prevent typo mistakes.',
      hints: {
        '1': 'Which keyword marks a virtual method override?',
      },
      order: 1,
    });

    // Lesson 2.2 Block 3 — fill_blank
    const exercise13 = await Exercise.create({
      lessonId: lesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Pure Virtual Function',
      instruction:
        'Fill in the syntax that makes a function pure virtual, turning the class abstract.',
      language: 'C++',
      type: 'fill_blank',
      level: 'hard',
      data: {
        template: [
          'class Shape {\npublic:\n  virtual double area() const ',
          ';\n};',
        ],
        placeholders: {
          input_1: '= 0',
        },
      },
      correctAnswer: {
        input_1: '= 0',
      },
      explanation:
        'A pure virtual function is declared with "= 0". A class containing a pure virtual function cannot be instantiated directly.',
      hints: {
        '1': 'What syntax creates a pure virtual function?',
      },
      order: 1,
    });

    console.log('✓ C++ Exercises created: 16 exercises');

    // ─── C++ Blocks ──────────────────────────────────────────────────────────

    console.log('\n🧩 Creating C++ Blocks...');

    const block1_setup_vscode = await Block.create({
      lessonId: lesson1_setup._id,
      title: 'Install VS Code',
      description: 'Download and open the editor used to write code',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'VS Code is a code editor. It is where you create files, write code, open the terminal, and manage your lesson folder. VS Code does not compile C++ by itself; it only makes writing code easier.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Go to https://code.visualstudio.com/download
Step 2: Choose the installer for your operating system
Step 3: Open the installer and keep the default options
Step 4: Open Visual Studio Code after installation

Self-check:
VS Code opens and you can create a new file`,
            explanation:
              'Follow these steps to install VS Code and check that it opens correctly.',
          },
        },
        {
          type: 'practice',
          data: {
            order: 3,
            exerciseId: exerciseSetupCppVsCode._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion:
        'In your own words, what is VS Code used for when learning C++?',
      feynmanPrompt:
        'Check whether the user understands that VS Code is an editor used to write code.',
    });

    const block1_setup_compiler = await Block.create({
      lessonId: lesson1_setup._id,
      title: 'Install a C++ Compiler',
      description: 'Install g++ and verify it from the terminal',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'C++ needs a compiler to turn a .cpp source file into a program that can run. In this lesson, we use g++ as the compiler. VS Code is where you write code; g++ is the tool that compiles that code.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Go to https://www.msys2.org/
Step 2: Install MSYS2 by following the official guide
Step 3: Install the MinGW-w64 toolchain
Step 4: Add the MinGW bin folder to PATH if needed
Step 5: Open a new terminal and run:
g++ --version

Self-check:
The terminal prints version information`,
            explanation:
              'These steps install g++ and verify that the terminal can find it.',
          },
        },
        {
          type: 'code',
          data: {
            order: 3,
            code: `g++ --version`,
            explanation:
              'Run this command in a new terminal. If it prints version information, your C++ compiler is installed correctly.',
          },
        },
        {
          type: 'practice',
          data: {
            order: 4,
            exerciseId: exerciseSetupCppCompiler._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion:
        'Why is installing VS Code alone not enough to run a C++ program?',
      feynmanPrompt:
        'Check whether the user understands that VS Code edits code while g++ compiles C++ code.',
    });

    const block1_setup = await Block.create({
      lessonId: lesson1_setup._id,
      title: 'Run Your First C++ Program',
      description: 'Create main.cpp, compile it, and run the output program',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'A basic C++ program usually goes through three stages: write source code in a .cpp file, compile it with a compiler, then run the output program.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Create a file named main.cpp
Step 2: Paste the sample code below
Step 3: Open the terminal in the same folder
Step 4: Compile:
g++ main.cpp -o main
Step 5: Run:
./main

Self-check:
The terminal prints Hello, C++!`,
            explanation:
              'Follow these steps to compile and run your first C++ program.',
          },
        },
        {
          type: 'code',
          data: {
            order: 3,
            code: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello, C++!" << endl;
  return 0;
}`,
            explanation:
              'Save this code as main.cpp, compile it with g++ main.cpp -o main, then run the generated program with ./main.',
          },
        },
        {
          type: 'practice',
          data: { order: 4, exerciseId: exerciseSetupCpp._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Briefly explain the process from main.cpp to a running C++ program.',
      feynmanPrompt:
        'Check whether the user understands that C++ source code must be compiled into an executable before running.',
    });

    const block1_1 = await Block.create({
      lessonId: lesson1_1._id,
      title: 'What is a Variable?',
      description: 'Data storage and types',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'Variables are named memory locations used to store data. Each variable has an identifier and a data type. C++ is statically typed, so you must declare a data type before using a variable.',
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
              'This example creates three variables: age as a whole number, height as a decimal number, and name as text. They are used to store personal information.',
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
      feynmanQuestion: 'Explain variables in C++ in your own words',
      feynmanPrompt:
        'Check whether the learner truly understands the concept of variables',
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
            text: 'C++ has primitive data types grouped into four main categories: integer types (int, short, long, long long), floating-point types (float, double, long double), character type (char), and boolean type (bool). Each type has a different memory size and value range.',
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
              'This demonstrates basic data types. int stores 32-bit whole numbers, long long stores 64-bit whole numbers, double stores high-precision decimal numbers, char stores a single character, and bool stores true/false values.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise3._id, required: true },
        },
      ]),
      feynmanQuestion: 'When would you choose int instead of double?',
      feynmanPrompt:
        'Check whether the learner understands the difference between integer and floating-point types',
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
            text: 'Type casting converts a value from one type to another. Implicit casting happens automatically when there is no data loss, such as int to double. Explicit casting uses static_cast<> when data may be lost, such as double to int. Constants are declared with const and cannot be changed after assignment.',
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
              'PI is a constant and cannot be changed. When an int is multiplied by a double, the int is automatically converted to double through implicit casting. static_cast<int> converts back to int and removes the decimal part.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise4._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why can explicit casting sometimes lose data?',
      feynmanPrompt:
        'Ask the learner to explain what happens to the decimal part when casting from double to int',
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
            text: 'Control flow lets you decide which parts of code will run. The main types are if-else for branching, switch-case for many fixed cases, and loops such as for and while for repetition.',
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
              'The for loop runs from 1 to 10. On each iteration, it uses the modulo operator (%) to check whether the number is even or odd.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise5._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why do we need control flow statements?',
      feynmanPrompt:
        'Check whether the learner understands the benefits of using if-else and loops',
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
            text: 'switch-case is an alternative to a chain of if-else statements when comparing one variable against many fixed values. Each case needs break to avoid fall-through. default handles all remaining cases.',
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
              'switch checks the value of day and jumps directly to the matching case. break prevents execution from continuing into the next case. default catches values outside 1-5.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise6._id, required: true },
        },
      ]),
      feynmanQuestion: 'When should you use switch instead of if-else?',
      feynmanPrompt:
        'Check whether the learner knows when switch is clearer and when if-else is more flexible',
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
            text: 'while repeats while the condition is true and checks the condition before running the block. do-while always runs at least once because it checks the condition after each iteration. break exits a loop immediately, while continue skips the rest of the current iteration.',
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
              'The while loop accumulates values until sum exceeds 50. The do-while loop runs once even though x=100 does not satisfy x < 10.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise7._id, required: true },
        },
      ]),
      feynmanQuestion: 'What is the difference between while and do-while?',
      feynmanPrompt:
        'Ask the learner to describe a real situation where do-while fits better than while',
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
            text: 'A class is a blueprint for creating objects. It contains attributes that describe state and methods that describe behavior. An object is a specific instance created from that class.',
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
              'This is a Student class with private fields (name, age) and a public method (display). The constructor initializes values when an object is created.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise8._id, required: true },
        },
      ]),
      feynmanQuestion:
        'What is a class, and how is it different from an object?',
      feynmanPrompt:
        'Check the learner understanding of the difference between a class definition and an instance',
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
            text: 'A constructor is a special method called automatically when an object is created. A class can have multiple constructors with different parameters through constructor overloading. A destructor (~ClassName) is called when an object is destroyed and is often used to release resources.',
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
              'Box has two constructors: a default constructor (1x1) and a parameterized constructor. The destructor prints a message when the object is destroyed. Destruction order is the reverse of creation order: b2 is destroyed before b1.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise9._id, required: true },
        },
      ]),
      feynmanQuestion: 'When is a destructor called?',
      feynmanPrompt:
        'Check understanding of the object lifecycle and why destructors matter when using dynamic memory',
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
            text: 'Encapsulation means hiding data inside a class and allowing access only through public methods. C++ has three access modifiers: public for access from anywhere, private for access only inside the class, and protected for access inside the class and subclasses. Getters and setters are methods used to read and update private data.',
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
              'balance is private, so no one can directly assign acc.balance = -9999. Only deposit and withdraw can change the balance, and they validate the value before updating it.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise10._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why should we use private instead of public for data?',
      feynmanPrompt:
        'Ask the learner to explain the benefit of encapsulation with a practical example',
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
            text: 'Inheritance allows one class to inherit attributes and methods from another class, which helps reuse code. Polymorphism allows objects of different classes to respond differently to the same method call through virtual functions.',
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
              'Dog and Cat inherit from Animal. Each class overrides sound() to produce a different sound. This is an example of polymorphism through virtual functions.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise11._id, required: true },
        },
      ]),
      feynmanQuestion: 'Why do we use virtual functions here?',
      feynmanPrompt:
        'Ask the learner to explain the benefit of polymorphism and give a practical example',
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
            text: 'An abstract class is a class that cannot be instantiated directly. It contains at least one pure virtual function declared with = 0. Every subclass must override all pure virtual functions before it can be instantiated.',
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
              'Shape cannot be instantiated because area() is pure virtual. Circle and Rectangle must both implement area(). describe() is inherited and can be used without overriding it.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise12._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Why can you not create an object from an abstract class?',
      feynmanPrompt:
        'Check whether the learner understands why abstract classes exist and how they differ from regular classes',
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
            text: 'C++ allows you to redefine the behavior of operators (+, -, *, ==, <<, and others) for custom classes. This can make code more intuitive. Operator overloading is a form of static polymorphism.',
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
              'operator+ returns a new Vector2D by adding each component. operator<< is declared as friend so it can access private members and allow direct use of cout << v.',
          },
        },
        {
          type: 'practice',
          data: { order: 3, exerciseId: exercise13._id, required: true },
        },
      ]),
      feynmanQuestion:
        'What is the benefit of operator overloading compared with using a normal function?',
      feynmanPrompt:
        'Ask the learner to compare v1 + v2 with add(v1, v2) in terms of readability and usability',
    });

    console.log('✓ C++ Blocks created: 15 blocks');

    // ─── Link C++ blocks to lessons ──────────────────────────────────────────

    console.log('\n🔗 Linking blocks to C++ lessons...');
    lesson1_setup.blocks = [
      block1_setup_vscode._id,
      block1_setup_compiler._id,
      block1_setup._id,
    ];
    lesson1_1.blocks = [block1_1._id, block1_1b._id, block1_1c._id];
    lesson1_2.blocks = [block1_2._id, block1_2b._id, block1_2c._id];
    lesson2_1.blocks = [block2_1._id, block2_1b._id, block2_1c._id];
    lesson2_2.blocks = [block2_2._id, block2_2b._id, block2_2c._id];

    await Promise.all([
      lesson1_setup.save(),
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

    const javaLesson1_setup = await Lesson.create({
      milestoneId: javaMilestone1._id,
      title: 'Setup Java Development Environment',
      order: 1,
      blocks: [],
    });

    const javaLesson1_1 = await Lesson.create({
      milestoneId: javaMilestone1._id,
      title: 'Variables and Types',
      order: 2,
      blocks: [],
    });
    const javaLesson1_2 = await Lesson.create({
      milestoneId: javaMilestone1._id,
      title: 'Control Flow',
      order: 3,
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
    const javaExerciseSetupVsCode = await Exercise.create({
      lessonId: javaLesson1_setup._id,
      tagId: tagIds('Environment Setup'),
      title: 'Install VS Code for Java',
      instruction: 'What is VS Code mainly used for when learning Java?',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'code editor', indent: 0 },
          { id: 'block-1', code: 'JDK', indent: 0 },
          { id: 'block-2', code: 'compiler', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'VS Code is an editor for writing Java code. To compile and run Java, you still need to install the JDK.',
      hints: {
        '1': 'An editor is where you write code; it is not the Java toolchain.',
      },
      order: 1,
    });

    const javaExerciseSetupJdk = await Exercise.create({
      lessonId: javaLesson1_setup._id,
      tagId: tagIds('Environment Setup'),
      title: 'Install the JDK',
      instruction:
        'Which toolchain do you need to compile and run Java programs?',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'JDK', indent: 0 },
          { id: 'block-1', code: 'g++', indent: 0 },
          { id: 'block-2', code: 'VS Code', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
      },
      explanation:
        'The JDK includes java for running programs and javac for compiling .java files.',
      hints: {
        '1': 'The JDK includes the javac compiler.',
      },
      order: 2,
    });

    const javaExerciseSetup = await Exercise.create({
      lessonId: javaLesson1_setup._id,
      tagId: tagIds('Environment Setup', 'Input Output'),
      title: 'Run Your First Java Program',
      instruction:
        'Choose the compile command first, then the run command for the sample Java program.',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 2,
        blocks: [
          { id: 'block-0', code: 'javac Main.java', indent: 0 },
          { id: 'block-1', code: 'java Main', indent: 0 },
          { id: 'block-2', code: 'g++ main.cpp -o main', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
      },
      explanation:
        'To run Java, you need the JDK, a Main.java file, javac to compile it, and java to run the Main class.',
      hints: {
        '1': 'Java needs the JDK because it includes both javac and java.',
        '2': 'Because the public class is Main, the file should be named Main.java.',
      },
      order: 3,
    });

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
        'The int variable stores a whole-number age, the double variable stores a decimal height, and String stores a name, which is already provided here.',
      hints: {
        '1': 'The data type keyword for whole numbers',
        '2': 'The data type keyword for decimal numbers',
      },
      order: 1,
    });

    // Java Lesson 1.1 Block 2 — drag_drop
    const javaExercise2 = await Exercise.create({
      lessonId: javaLesson1_1._id,
      tagId: tagIds('Data Types'),
      title: 'Match Java Types',
      instruction:
        'Drag the correct value for each Java data type in this order: int, String, double, boolean.',
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
          { id: 'block-4', code: 'abc', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-0',
        '2': 'block-1',
        '3': 'block-2',
        '4': 'block-3',
      },
      explanation:
        'int accepts a whole number (25), String accepts text in double quotes ("Bob"), double accepts a decimal number (50000.50), and boolean accepts true/false.',
      hints: {
        '1': 'int stores whole numbers',
        '2': 'String stores text',
        '3': 'double stores decimal numbers',
        '4': 'boolean stores true/false',
      },
      order: 1,
    });

    // Java Lesson 1.1 Block 3 — fill_blank
    const javaExercise3 = await Exercise.create({
      lessonId: javaLesson1_1._id,
      tagId: tagIds('Type Conversion', 'Data Types'),
      title: 'Type Narrowing in Java',
      instruction:
        'Fill in the correct keyword to perform the type conversion below.',
      language: 'Java',
      type: 'fill_blank',
      level: 'medium',
      data: {
        template: ['double d = 9.99;\nint i = (', ') d; // narrowing cast'],
        placeholders: {
          input_1: 'int',
        },
      },
      correctAnswer: {
        input_1: 'int',
      },
      explanation:
        'Converting from double to int requires an explicit cast with "(int)". The decimal part (.99) is truncated.',
      hints: {
        '1': 'The type written in parentheses for casting',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 1 — drag_drop
    const javaExercise4 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Control Flow'),
      title: 'If-Else Structure',
      instruction:
        'Choose the correct control-flow keywords for this expression: "__ (score >= 60) { ... } __ { ... }".',
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
        'if checks the condition. else handles the remaining case. If the condition is false, the code runs inside else.',
      hints: {
        '1': 'The keyword used to check a condition',
        '2': 'The keyword used for the alternative branch',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 2 — fill_blank
    const javaExercise5 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Operators', 'Control Flow'),
      title: 'Ternary Operator',
      instruction:
        'Fill in the correct symbols to complete the ternary expression.',
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
        'The ternary operator is a compact form of if-else: condition ? valueIfTrue : valueIfFalse. If the condition is true, it returns valueIfTrue; otherwise, it returns valueIfFalse.',
      hints: {
        '1': 'The symbol that separates the condition from the true value',
        '2': 'The symbol that separates the true value from the false value',
      },
      order: 1,
    });

    // Java Lesson 1.2 Block 3 — drag_drop
    const javaExercise6 = await Exercise.create({
      lessonId: javaLesson1_2._id,
      tagId: tagIds('Loops'),
      title: 'Loop Control Keywords',
      instruction:
        'In loop structures, the keyword __ exits the loop immediately, and __ skips the current iteration.',
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
        'break exits the loop immediately, such as stopping at i=5. continue skips the rest of the current iteration and moves to the next one.',
      hints: {
        '1': 'The keyword used to exit a loop immediately',
        '2': 'The keyword used to skip the current iteration',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 1 — fill_blank
    const javaExercise7 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Class Constructor',
      instruction: 'Fill in the correct constructor name for class Car.',
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
        'A constructor must have the same name as the class. It is called automatically when an object is created with new Car(...).',
      hints: {
        '1': 'The constructor name must match which class name?',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 2 — drag_drop
    const javaExercise8 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Getter Method Pattern',
      instruction: 'Drag the best getter name for reading the name field.',
      language: 'Java',
      type: 'drag_drop',
      level: 'easy',
      data: {
        expectedSlots: 1,
        blocks: [
          { id: 'block-0', code: 'readName', indent: 0 },
          { id: 'block-1', code: 'getname', indent: 0 },
          { id: 'block-2', code: 'getName', indent: 0 },
          { id: 'block-3', code: 'fetchName', indent: 0 },
          { id: 'block-4', code: 'name', indent: 0 },
        ],
      },
      correctAnswer: {
        '1': 'block-2',
      },
      explanation:
        'By convention, a getter starts with "get" and capitalizes the first letter of the field name. getName reads the name value.',
      hints: {
        '1': 'What word should a getter start with?',
      },
      order: 1,
    });

    // Java Lesson 2.1 Block 3 — fill_blank
    const javaExercise9 = await Exercise.create({
      lessonId: javaLesson2_1._id,
      tagId: tagIds('OOP'),
      title: 'Static Variable',
      instruction:
        'Fill in the correct keyword to declare an int variable shared by all instances of the class.',
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
        'A static variable belongs to the class, not to an individual object. All instances share the same static variable. It can be accessed through ClassName.field.',
      hints: {
        '1': 'The keyword used to declare a shared variable',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 1 — drag_drop
    const javaExercise10 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Extends and Implements',
      instruction:
        'Fill in the correct keywords to express the relationships between classes. Dog __ Animal, Cat __ Speakable.',
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
        'extends means inheriting from a parent class. implements means fulfilling an interface contract. Dog extends Animal, and Cat implements Speakable.',
      hints: {
        '1': 'The keyword used to inherit from a class',
        '2': 'The keyword used to implement an interface',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 2 — fill_blank
    const javaExercise11 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Abstract Method',
      instruction:
        'Fill in the keyword used to declare a method with no implementation in an abstract class.',
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
        'An abstract method has no implementation. A subclass must override it. A class containing an abstract method must be an abstract class.',
      hints: {
        '1': 'The keyword used to declare a method with no body',
      },
      order: 1,
    });

    // Java Lesson 2.2 Block 3 — drag_drop
    const javaExercise12 = await Exercise.create({
      lessonId: javaLesson2_2._id,
      tagId: tagIds('OOP'),
      title: 'Default Interface Method',
      instruction:
        'Drag the correct access modifier for declaring a default method in an interface.',
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
        'An interface method must be public because an interface is a public contract. A default method can have an implementation without forcing implementing classes to override it.',
      hints: {
        '1': 'Which access modifier must an interface method have?',
      },
      order: 1,
    });

    console.log('✓ Java Exercises created: 15 exercises');

    // ─── Java Blocks ─────────────────────────────────────────────────────────

    console.log('\n🧩 Creating Java Blocks...');

    const javaBlock1_setup_vscode = await Block.create({
      lessonId: javaLesson1_setup._id,
      title: 'Install VS Code',
      description: 'Download and open the editor used to write Java code',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'VS Code is a code editor. It is where you create files, write Java code, open the terminal, and manage your project. VS Code is not the JDK, so it cannot compile Java by itself if the Java toolchain is missing.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Go to https://code.visualstudio.com/download
Step 2: Choose the installer for your operating system
Step 3: Install VS Code with the default options
Step 4: Open VS Code after installation

Self-check:
VS Code opens and you can create a new file`,
            explanation:
              'Follow these steps to install VS Code and check that it opens correctly.',
          },
        },
        {
          type: 'practice',
          data: {
            order: 3,
            exerciseId: javaExerciseSetupVsCode._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion:
        'In your own words, what is VS Code used for when learning Java?',
      feynmanPrompt:
        'Check whether the user understands that VS Code is the editor used to write Java code.',
    });

    const javaBlock1_setup_jdk = await Block.create({
      lessonId: javaLesson1_setup._id,
      title: 'Install the JDK',
      description: 'Install Java tools and verify java and javac',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'The JDK is the Java Development Kit. It includes java for running Java programs and javac for compiling .java source files.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Go to https://adoptium.net/temurin/releases/
Step 2: Choose the latest LTS JDK for your operating system
Step 3: Install it with the default options
Step 4: Open a new terminal and run:
java --version
Step 5: Run:
javac --version

Self-check:
Both commands print version information`,
            explanation:
              'Follow these steps to install the JDK and verify java and javac.',
          },
        },
        {
          type: 'code',
          data: {
            order: 3,
            code: `java --version
javac --version`,
            explanation:
              'Run both commands in a new terminal. java checks the runtime, while javac checks the compiler.',
          },
        },
        {
          type: 'practice',
          data: {
            order: 4,
            exerciseId: javaExerciseSetupJdk._id,
            required: true,
          },
        },
      ]),
      feynmanQuestion:
        'Explain the difference between java and javac in simple words.',
      feynmanPrompt:
        'Check whether the user understands that javac compiles Java code and java runs compiled Java classes.',
    });

    const javaBlock1_setup = await Block.create({
      lessonId: javaLesson1_setup._id,
      title: 'Run Your First Java Program',
      description: 'Create Main.java, compile it, and run the class',
      content: asBlockContent([
        {
          type: 'theory',
          data: {
            order: 1,
            text: 'A basic Java program usually goes through three stages: write source code in a .java file, compile it with javac, then run the class with java.',
          },
        },
        {
          type: 'code',
          data: {
            order: 2,
            code: `Step 1: Create a file named Main.java
Step 2: Paste the sample code below
Step 3: Open the terminal in the same folder
Step 4: Compile:
javac Main.java
Step 5: Run:
java Main

Self-check:
The terminal prints Hello, Java!`,
            explanation:
              'Follow these steps to compile and run your first Java program.',
          },
        },
        {
          type: 'code',
          data: {
            order: 3,
            code: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Java!");
  }
}`,
            explanation:
              'Save this code as Main.java, compile it with javac Main.java, then run it with java Main.',
          },
        },
        {
          type: 'practice',
          data: { order: 4, exerciseId: javaExerciseSetup._id, required: true },
        },
      ]),
      feynmanQuestion:
        'Briefly explain the process from Main.java to a running Java program.',
      feynmanPrompt:
        'Check whether the user understands that Java source code is compiled before being run by the JVM.',
    });

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

    console.log('✓ Java Blocks created: 15 blocks');

    // ─── Link Java blocks to lessons ─────────────────────────────────────────

    console.log('\n🔗 Linking blocks to Java lessons...');
    javaLesson1_setup.blocks = [
      javaBlock1_setup_vscode._id,
      javaBlock1_setup_jdk._id,
      javaBlock1_setup._id,
    ];
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
      javaLesson1_setup.save(),
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
    console.log('  📖 Lessons       : 10');
    console.log('  🧩 Blocks        : 30');
    console.log('  💪 Exercises     : 31');

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
