/*
  shadcn/ui primitives (Button, Badge, Card) adapted to the CareBridge tokens.
  Same API as shadcn: cva variants, `asChild` through Radix Slot, `cn` for class merging.
*/
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
    "hover:no-underline active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[0_10px_24px_-12px_rgba(5,102,141,0.8)] hover:bg-brand-800 hover:shadow-[0_14px_30px_-12px_rgba(5,102,141,0.9)]",
        mint: "bg-gradient-to-r from-verdigris to-mint text-white shadow-[0_10px_24px_-12px_rgba(0,168,150,0.9)] hover:brightness-105",
        outline: "border border-line bg-white/80 text-ink backdrop-blur hover:border-teal hover:bg-white hover:text-brand-700",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        ghost: "text-ink hover:bg-brand-50",
        white: "bg-white text-ink shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] hover:bg-cream",
        glass: "border border-white/40 bg-white/15 text-white backdrop-blur hover:bg-white/25",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-5 text-[0.95rem]",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...(asChild ? {} : { type })} {...props} />;
});
Button.displayName = "Button";

export const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-white",
      soft: "border-brand-200/60 bg-white/80 text-brand-700 backdrop-blur",
      mint: "border-transparent bg-[#dcf6ee] text-[#0b6b55]",
      cream: "border-[#e3e6b0] bg-cream/70 text-[#4c5110]",
      danger: "border-transparent bg-attention text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-2xl border border-line bg-white text-text shadow-card", className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col gap-1.5 p-6", className)} {...p} />;
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn("text-lg font-semibold leading-tight text-ink", className)} {...p} />;
export const CardDescription = ({ className, ...p }: HTMLAttributes<HTMLParagraphElement>) => <p className={cn("text-[0.95rem] text-muted", className)} {...p} />;
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn("p-6 pt-0", className)} {...p} />;
export const CardFooter = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn("flex items-center p-6 pt-0", className)} {...p} />;
