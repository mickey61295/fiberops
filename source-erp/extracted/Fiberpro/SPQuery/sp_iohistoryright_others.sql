/*      

;=============================================      

; Author   :  Global Software's      

; Create date  :  15/09/2014      

; Create By   :  Radhakrishnan      

; Description  :  Budget Vs Actual  (or) Over All Consolidation      

; Change Person  :  ASLAM      

; Last Change Date :  08/03/2023 06.00 PM  

; =============================================       

*/  

CREATE PROCEDURE sp_iohistoryright_others (@Ipaddr as varchar(25))  

as  

begin  

--declare curs1 cursor for  select coycode,dcno,ordid ,deptname ,pname,coycode,ProcessType,ipaddress ,dcno,dcfinyear from TempIohisRight  

declare curs1 cursor for  select coycode ,dcno ,ordid  ,deptname ,pname ,ProcessType ,TrsType ,grnno ,GrnFinyear ,partydcref ,GItemDesc  ,RecBags ,RecKgs ,Recmtr ,RUOM ,RecMainUom ,deptid ,grndate ,PurType,dcfinyear ,RecDia,External_GRN  from TempIohisRight_Others where IpAddress=@ipaddr order by grndate,grnno  

open curs1  

declare @coycode int  

declare @dcno int  

declare @cnt int   

declare @ordid int   

declare @deptname char(50)  

declare @pname char(102)  

declare @processtype char(1)  

declare @trstype char(50)  

declare @grnno int  

declare @grnfinyear char(2)  

declare @partydcref char(25)  

declare @GItemDesc char(300)  

declare @RecBags int   

declare @RecKgs numeric(18,3)  

declare @Recmtr numeric(18,3)  

declare @ruom  char(10)  

declare @RecMainUom char(10)  

declare @deptid int    

declare @grndate datetime   

declare @PurType char(10)  

declare @dcfinyear char(2)  

declare @recdia char(20)

declare @MultiGRN char(1)  

  

                                     

fetch next from curs1 into       @coycode,@dcno,@ordid ,@deptname,@pname ,@processtype,@TrsType,@grnno,@grnfinyear,@partydcref,@gitemdesc,@recbags,@reckgs,@recmtr,@ruom,@RecMainUom,@deptid,@grndate,@purtype,@dcfinyear ,@recdia,@MultiGRN  

while @@FETCH_STATUS = 0  

begin  

     print @dcno  

     if @dcno is null or @dcno =0   

        begin  

        set @cnt=0  
		if @deptname='ACCESSORIES' 
        select top 1 @cnt=sl1 from TempIoHisLedger_Others where ordid = @ordid And deptname = @deptname And pname = @pname And grnno Is null And DcPro_TYpe = @ProcessType And ipaddress = @Ipaddr and DItemDesc = @GItemDesc order by sl1  
		ELSE
		select top 1 @cnt=sl1 from TempIoHisLedger_Others where ordid = @ordid And deptname = @deptname And pname = @pname And grnno Is null And DcPro_TYpe = @ProcessType And ipaddress = @Ipaddr order by sl1  

        if @cnt>0   

           begin  

                UPDATE TempIoHisLedger_Others SET recdia=@recdia, grndate=@grndate, GTRSTYPE=@TrsType ,GRNNO=@GRNNO ,GRNFINYEAR=@grnfinyear,PDCREF=@PARTYDCREF,GITEMDESC=@gitemdesc, RecBags=@recbags,RecKgs=@reckgs ,Recmtr=@recmtr ,RUom=@ruom ,RecMainUom=@recmainuom,External_GRN=@MultiGRN where  sl1=@cnt  

           end  

        else  

           begin  

              Insert into TempIoHisLedger_Others (Coycode,Pname,Deptname,DeptId,OrdId,GTrsType,Grnno,Grnfinyear,GrnDate,PDcRef,GItemDesc,RecBags,RecKgs,Recmtr,RUom,PurType,RecMainUom,DcPro_TYpe,IPAddress,recdia,External_GRN)    

              values(@COYCODE,@Pname,@Deptname,@DeptId,@OrdId,@TrsType,@Grnno,@grnfinyear,@GrnDate,@PARTYDCREF,@gitemdesc,@recbags,@reckgs,@recmtr,@RUom,@pURTYPE,@recmainuom,@ProcessType,@ipaddr,@recdia,@MultiGRN)  

           end      

        end  

    else  

       begin  

       set @cnt=0  

        select top 1 @cnt=sl1 from TempIoHisLedger_Others where ordid = @ordid And deptname = @deptname And pname = @pname And grnno Is null And dcpro_type = @ProcessType And ipaddress = @Ipaddr and DCNo=@dcno and dcfinyear=@dcfinyear  

        if @cnt>0   

           begin  

              UPDATE TempIoHisLedger_Others SET recdia=@recdia,grndate=@grndate, GTRSTYPE=@TrsType ,GRNNO=@GRNNO ,GRNFINYEAR=@grnfinyear,PDCREF=@PARTYDCREF,GITEMDESC=@gitemdesc, RecBags=@recbags,RecKgs=@reckgs ,Recmtr=@recmtr ,RUom=@ruom ,RecMainUom=@recmainuom,
External_GRN =@MultiGRN 

where  sl1=@cnt  

           end  

        else  

           begin  

              Insert into TempIoHisLedger_Others(Coycode,Pname,Deptname,DeptId,OrdId,GTrsType,Grnno,Grnfinyear,GrnDate,PDcRef,GItemDesc,RecBags,RecKgs,Recmtr,RUom,PurType,RecMainUom,DcPro_TYpe,IPAddress,dcno,dcfinyear,recdia,External_GRN)    

              values(@COYCODE,@Pname,@Deptname,@DeptId,@OrdId,@TrsType,@Grnno,@grnfinyear,@GrnDate,@PARTYDCREF,@gitemdesc,@recbags,@reckgs,@recmtr,@RUom,@pURTYPE,@recmainuom,@ProcessType,@ipaddr,@dcno,@dcfinyear,@recdia,@MultiGRN)  

           end      

        end  

fetch next from curs1 into    @coycode,@dcno,@ordid ,@deptname,@pname ,@processtype,@TrsType,@grnno,@grnfinyear,@partydcref,@gitemdesc,@recbags,@reckgs,@recmtr,@ruom,@RecMainUom,@deptid,@grndate,@purtype,@dcfinyear ,@recdia,@MultiGRN  

end  

close curs1  

deallocate curs1  

end

  