<?php

function getAge($then) {
  $then_ts = strtotime($then);
  $then_year = date('Y', $then_ts);
  $age = date('Y') - $then_year;
  if(strtotime('+' . $age . ' years', $then_ts) > time()) $age--;
  return $age;
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="module/tailwind.css" rel="stylesheet">
    <link href="module/style.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">

    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="icon" href="./img/logo-tp.png">

    <title>Istaqom Wirawan Adi Pratama</title>
</head>
<body>
  <div class="gradient bg-white rounded-lg container mx-auto mt-4 w-4/5">
    <div class="flex justify-center pt-4">
      <a href="index.php" class="">
        <img src="./img/logo-tp.png" class="object-center w-52">
      </a>
    </div>
      <p class="roboto-500 sm:text-1xl md:text-3xl lg:text-4xl xl:text-5xl text-center pb-2">Hello, I'm Istaqom Wirawan Adi Pratama</p>
      <p class="roboto-300 sm:text-lg md:text-1xl lg:text-2xl xl:text-3xl text-center pb-10">An <?= getAge('2002-09-15') ?>-years-old college student majoring in Informatics from Samarinda, Indonesia.</p>
      <div class="flex justify-center pb-10">
        <img src="./img/me.jpg" class="border-8 border-orange object-center sm:w-64 md:w-72 lg:w-80 xl:w-96 rounded-full">
      </div>
  </div>
</body>
</html>