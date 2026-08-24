/*

;=============================================

; Author		:		Global Software's

; Create date		:		05/04/2022

; Create By		:		ASLAM

; Description		:		Style No Change

; Change Person		:		SWETHA

; Last Change Date	:		02/04/2024 10.30 AM

; =============================================	

*/



Create Procedure SP_StyleChange(@Ordid int,@Styleno Varchar(20),@NewStyleno Varchar(20),@UserId int)

AS

/*Create Table Trs_StyleChangeLog (Id int identity,dt DateTime, ordid int,styleno varchar(20),newstyleno Varchar(20),userid int)*/

DECLARE @allstyleno varchar(100)



BEGIN TRANSACTION



INSERT INTO Trs_StyleChangeLog (Dt,Ordid,Styleno,NewStyleno,UserId) VALUES (GETDATE(),@Ordid,@Styleno,@NewStyleno,@UserId)





Update OrderStyleDtl SET StyleNo = @NewStyleno,UpdateFlg =1  WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderQtyDtl SET StyleNo = @NewStyleno,UpdateFlg=1,Size_Updateflg=1 WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_PartDtl SET StyleNo = @NewStyleno,UpdateFlg=1 WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrdQtyClrDtl SET StyleNo = @NewStyleno,UpdateFlg=1 WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrdSizeMas SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrdStyle SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderLotRateDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderStylewiseCost SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrdProgPcsWgt SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderStyleImage SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderStyleImageAcc SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderStyleImgDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderQtyDtl_Amend SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrdQtyClrDtl_Amend SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Ord_GramDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderAccImgDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update OrderProgQty SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_Addl_color SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_Addl_Lot SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_Addl_Size SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_Addl_RatioDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Order_Addl_color_CompDet SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



SELECT @allStyleno = SUBSTRING(isNull(stuff(( select '/' + x.Styleno	from (Select Distinct Rtrim(Isnull(Styleno,'')) As Styleno  From OrderstyleDtl WHERE Ordid =@Ordid ) x FOR XML PATH('')),1,1,''),''),1,30)



print @allstyleno



UPDATE ORDERMAS2 SET STYLENO = @allStyleNo WHERE ORDID = @Ordid 





Update Prog_ClrComb SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_Component SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PartDefine SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Print_Design SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Pro_ReqYarn SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqKnitt SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqKnitt_Combowise SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqKnitt_Det SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqYarn_ComboWise SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqYarn_Det SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqActual SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Pro_ReqJob SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqJob_1 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Pro_ReqYarn_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ReqKnitt_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PartDefine_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_ClrComb_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_Component_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_Design_Duplicate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Prog_Design SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_ClrDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_Comments SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Prog_DiaChange SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_InputPanels SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_PanelEntry SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_ReqCalTWrk SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prog_YTwist_MAs SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Prog_AccMas SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PRO_AccJobReq SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PRO_AccReq SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PRO_AccReq_ComboWise SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PRO_AccReq_GreyClrDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prod_CutComponents SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Pro_Prod_BitCutRate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_Prod_Panelwiserate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_Prod_PartwiseRate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pro_ProdPros SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PROD_SEQUENCE SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Prod_Slno SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Prod_Source_Operation SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Production_Started_Old_OrderList SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Pay_BarcodeGeneration SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pay_CuttProdMas SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pay_ProdWorkDetails SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Payment_OrdTransferdtl SET FromStyleNo = @NewStyleno WHERE FromOrdid = @Ordid And FromStyleno = @Styleno 

Update Payment_OrdTransferdtl SET ToStyleNo = @NewStyleno WHERE ToOrdID = @Ordid And ToStyleno = @Styleno 

Update PaymentDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pcs_RejStockTable SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Pcs_StockTable SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PcsStockRatePost SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update PcsStockRatePost_All SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PcsStockValue SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Po_Dtl_ArticleNoPopNo SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Po_Dtl_DetailedClrDesc SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Po_Dtl_SkucodeClrSizeWise SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 





Update PrgSample_Final_Fab_Det SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update PrgSample_Process_Route SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 



Update Trs_Po5 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_GRN2 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_Del2 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_Del3 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 





Update Trs_AccSchedule SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_AddPanelEntry SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_BillDeb2 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 

Update Trs_BillRate SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_ContractorAllotment_Mas SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_ContractorBal SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_CuttingShortage SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_deb3 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_Desp_Rate SET StyleNo = @NewStyleno from trs_pcs1 a inner join Trs_Desp_Rate on a.id = Trs_Desp_Rate.id WHERE a.Ordjobno = @Ordid And Styleno = @Styleno  



Update Trs_Expenses SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_FinishedGoods1 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_GrnWaste2 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_InAccDel2 SET StyleNo = @NewStyleno FROM Trs_InAccDel1 A INNER JOIN Trs_InAccDel2 on a.id = Trs_InAccDel2.id WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_InFabDel_Ret2 SET StyleNo = @NewStyleno FROM Trs_InFabDel_Ret1 A INNER JOIN Trs_InFabDel_Ret2 ON A.id = Trs_InFabDel_Ret2.id WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_InFabDel2 SET StyleNo = @NewStyleno FROM Trs_InFabDel1 A INNER JOIN Trs_InFabDel2 ON A.id = Trs_InFabDel2.id WHERE Ordid = @Ordid And Styleno = @Styleno  



Update trs_Inv_DomesticDet SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_LaterPOEntry SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_LaterPOEntryDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_LineTargetProdn SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_MultiPrs_Grn3 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_NewInvConDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_NewInvCtnConDtls SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_NewInvCtnDtls SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_NewInvDtl SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_Opening SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_OrderAllotment SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_Packinglist_Mas SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_PanelExcess SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_PanelExcessStage SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_PanelRej SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_PanelReWork2 SET StyleNo = @NewStyleno FROM Trs_PanelReWork1 A INNER JOIN Trs_PanelReWork2 ON a.Id = Trs_PanelReWork2.Id WHERE ordJobno = @Ordid And Styleno = @Styleno  





Update Trs_Pcs2 SET StyleNo = @NewStyleno FROM Trs_Pcs1 A INNER JOIN Trs_Pcs2 ON a.Id = Trs_Pcs2.Id WHERE ordJobno = @Ordid And Styleno = @Styleno  



Update Trs_Pcs2_Acc SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_Pcs2_Panel SET StyleNo = @NewStyleno FROM Trs_Pcs1_Panel A INNER JOIN Trs_Pcs2_Panel ON a.Id = Trs_Pcs2_Panel.Id WHERE ordJobno = @Ordid And Styleno = @Styleno  



Update Trs_PcsAdj1 SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_PcsGodAck2 SET StyleNo = @NewStyleno FROM Trs_PcsGodAck2 A INNER JOIN Trs_Pcs1 ON a.TransId = Trs_Pcs1.Id WHERE Ordjobno = @Ordid And Styleno = @Styleno  and DelType='Godown Transfer'



Update Trs_PcsGrn2 SET StyleNo = @NewStyleno FROM Trs_PcsGrn2  INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Id = Trs_PcsGrn2.Id WHERE Ordjob = @Ordid And Styleno = @Styleno  



Update Trs_PcsGrn3_MistakePcs SET StyleNo = @NewStyleno FROM Trs_PcsGrn3_MistakePcs  INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Id = Trs_PcsGrn3_MistakePcs.Id WHERE Ordjob = @Ordid And Styleno = @Styleno  





Update Trs_PcsGrn4_PackingDCDet SET StyleNo = @NewStyleno FROM Trs_PcsGrn4_PackingDCDet  INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Id = Trs_PcsGrn4_PackingDCDet.Id WHERE Ordjob = @Ordid And Styleno = @Styleno  



Update Trs_PcsOpening SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  

Update Trs_PcsRej SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno  



Update Trs_PcsStkAdjustmentDtl SET StyleNo = @NewStyleno FROM Trs_PcsStkAdjustmentDtl  inner join Trs_PcsStkAdjustment A on a.id = Trs_PcsStkAdjustmentDtl.id WHERE A.Ordjobno = @Ordid And Styleno = @Styleno  



Update Trs_PcsStockTfr1 SET FromStyleNo = @NewStyleno WHERE FromOrdID = @Ordid And FromStyleNo = @Styleno  

Update Trs_PcsStockTfr1 SET ToStyleNo = @NewStyleno WHERE ToOrdId = @Ordid And ToStyleNo = @Styleno  

Update Trs_Prd_Stage_BypassSetting SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdBillDetNew SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdBillEntry SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_Prodentry SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdExp SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdOpr_Breakup SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdReserve SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdShiftStyle_Contribute SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdShiftWages SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_Production_Consolidate SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ProdWages SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ReadyToCut_Ret2 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_ReadyToCut2 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  



Update Trs_RejGodTran2 SET StyleNo = @NewStyleno FROM Trs_RejGodTran1 A  inner join Trs_RejGodTran2  on a.id = Trs_RejGodTran2.id WHERE A.Ordjobno = @Ordid And Styleno = @Styleno  



Update Trs_Schedule SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_SewingBrkDown1 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno  

Update Trs_Shortage SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update Trs_ShortageBits SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update Trs_ShortagePcs SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Trs_StylewiseSingleExpense SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Trs_UnitAck2 SET StyleNo = @NewStyleno FROM Trs_Pcs1 A  inner join Trs_UnitAck2 on a.id = Trs_UnitAck2.TransID WHERE A.Ordjobno = @Ordid And Styleno = @Styleno  



Update Trs_YarnCons SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Acc_OrderQtyDtl SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update Acc_OrdQtyClrDtl SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Acc_PO_HSN_Detail SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update App_ApprovalPlan SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update App_ApprovalSent SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Bud_InhRateclw SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Budget_CostFix_det SET StyleNo = @NewStyleno FROM Budget_CostFix A INNER JOIN Budget_CostFix_Det ON A.TranID = Budget_CostFix_Det.ID WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update BudPodet SET StyleNo = @NewStyleno FROM BudPoMas A inner join BudPodet on a.id = BudPodet.Id WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update Commondo_Order_Img SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update  Currentstock SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update  Cutting_Job SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   


Update  Trs_JobOrder_PanelStock SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   


Update  DailyStockReg SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  DailyUnit_P_and_L SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  EnquiryDet SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update  GrnPcswt SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  IE_Input SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  JobOrderimage SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  LabTestMas SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  Lot_GrpOrd_Det SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   



Update  Meeting SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno   

Update  MR_PRocessDetails SET StyleNo = @NewStyleno,UpdateFlg =1 WHERE OrdId = @Ordid And StyleNo = @Styleno    

Update  MR_Production SET StyleNo = @NewStyleno,ActualPosting_UpdateFlg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno    

 

Update  MR_Production SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

Update  SewingOprBDImage SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    



Update  SewingReq1 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

Update  SewingReq2 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

Update  SewingReq3 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

Update  Ship_InvDet SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

 

Update  ShippingBill_Det SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  ST_Acc_PartyBal_Abs SET StyleNo = @NewStyleno,Updateflg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  ST_Acc_Prog_Balance SET StyleNo = @NewStyleno,UpdateFlg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  ST_Ord_inHand SET StyleNo = @NewStyleno,updateflg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  ST_PartyBalance_Abs SET StyleNo = @NewStyleno,updateflg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  ST_Production_Data SET StyleNo = @NewStyleno,updateflg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  ST_Production_Data SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  ST_Production_Data SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  ST_ProgBalance_Fabric SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  ST_ProgBalance_Yarn SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  ST_Supp_Production_Data SET StyleNo = @NewStyleno,updateflg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  Stylewise_orderqty SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  SuppAccDet SET StyleNo = @NewStyleno FROM SuppOrdMas A INNER JOIN SuppAccDet ON A.SuppOrdId = SuppAccDet.SuppOrdId WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  SuppAssortDet SET StyleNo = @NewStyleno FROM SuppOrdMas A INNER JOIN SuppAssortDet ON A.SuppOrdId = SuppAssortDet.SuppOrdId WHERE OrdId = @Ordid And StyleNo = @Styleno 



Update  SuppOrdDet SET StyleNo = @NewStyleno FROM SuppOrdMas A INNER JOIN SuppOrdDet ON A.SuppOrdId = SuppOrdDet.SuppOrdId WHERE OrdId = @Ordid And StyleNo = @Styleno 



Update  SuppOrdImage SET StyleNo = @NewStyleno FROM SuppOrdMas A INNER JOIN SuppOrdImage ON A.SuppOrdId = SuppOrdImage.Id WHERE OrdId = @Ordid And StyleNo = @Styleno 



Update  SuppOrdStyleDtl SET StyleNo = @NewStyleno FROM SuppOrdMas A INNER JOIN SuppOrdStyleDtl ON A.SuppOrdId = SuppOrdStyleDtl.SuppOrdId WHERE OrdId = @Ordid And StyleNo = @Styleno 



Update  SuppCommDet SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  Supplier_Transaction1 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  TempBudandActFabStyleWiseDtl SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  TestMas SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     



Update  tmp_shipment_det1 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  tmp_shipment_det2 SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  Tmp_HourlyProduction SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno    

 

Update  Wages_ProductionDet SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  WBS_Production SET StyleNo = @NewStyleno,ActualPosting_UpdateFlg=1 WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  WBS_Supp_Production SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     

Update  WF_WorkFlow_Document SET StyleNo = @NewStyleno WHERE OrdId = @Ordid And StyleNo = @Styleno     
Update Panel_StockTable SET StyleNo = @NewStyleno WHERE Ordid = @Ordid And Styleno = @Styleno 


 IF @@ERROR <> 0  

   ROLLBACK TRANSACTION  

  ELSE  

   COMMIT TRANSACTION  




