import Head from "next/head";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";

function ErrorPage() {
  const { query } = useRouter();

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>
      <div className=" grid grid-cols-12 text-2xl text-center h-screen">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="logo"
            />
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto">
            <div className="flex flex-col gap-2 mt-[100px]">
              <div className="font-bold text-[#ff0000] underline">
                {query.title}
              </div>
              <p className="text-xm">
                <div>{query.message}</div>
                <p className="text-sm">{query.suggestion}</p>
                <p className="text-sm">
                  {"< "}ติดต่อผู้ให้บริการ{" >"}
                </p>
                <Link
                  href={query.title == "KU16" ? "/setting?r=nls" : "/home"}
                  className="btn btn-primary"
                >
                  Back
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ErrorPage;
